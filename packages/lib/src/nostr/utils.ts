import type { Event as NostrEvent } from "nostr-tools/pure";
import { createMachine, createActor } from "xstate";
import {
  assignExecutor,
  isCreator,
  isCreatorOrExecutor,
  isExecutor,
  isNotCreator,
  isReceiver,
  stateMachineDefinitionKind,
  stateMachineSnapshotKind,
  stateMachineTransitionKind,
} from "../protocol.js";
import type { NostrSigner } from "./types.js";
import { createAtobMachineDefinition } from "../machines/atob.js";

// Enhanced event types that can include additional properties
export interface EnhancedNostrEvent extends Omit<NostrEvent, "verified"> {
  sm_pub?: string;
}

export interface DeliveryContractResult {
  contractEvent: EnhancedNostrEvent;
  stateEvent: EnhancedNostrEvent;
}

// Helper function to create contract event (Kind 7500)
export async function createContractEvent(
  signer: NostrSigner,
  d_tag: string,
  machineDefinition: any,
  title: string,
  description: string,
  additionalTags: string[][] = [],
) {
  const creatorPk = await signer.getPublicKey();
  const tags = [
    ["state", `30078:${creatorPk}:${d_tag}`],
    ["title", title],
    ["description", description],
    ["engine", "xstate@5"],
    ...additionalTags,
  ];

  const contractEvent = await signer.signEvent({
    kind: stateMachineDefinitionKind,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: JSON.stringify(machineDefinition),
  });

  return contractEvent;
}

// Helper function to create initial state event (Kind 30078)
export async function createStateEvent(
  signer: NostrSigner,
  d_tag: string,
  contractEvent: NostrEvent,
  initialState: any,
) {
  const stateEvent = await signer.signEvent({
    kind: stateMachineSnapshotKind,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["d", d_tag],
      ["e", contractEvent.id],
    ],
    content: JSON.stringify(initialState),
  });

  return stateEvent;
}

// Helper function to create transition event (Kind 7501)
export async function createTransitionEvent(
  signer: NostrSigner,
  contractEventId: string,
  eventType: string,
  content: string = "",
) {
  const transitionEvent = await signer.signEvent({
    kind: stateMachineTransitionKind,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["e", contractEventId],
      ["t", eventType],
    ],
    content,
  });

  return transitionEvent;
}

// Helper function to update state event
export async function updateStateEvent(
  signer: NostrSigner,
  d_tag: string,
  contractEvent: NostrEvent,
  newState: any,
) {
  const updatedStateEvent = await signer.signEvent({
    kind: stateMachineSnapshotKind,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["d", d_tag],
      ["e", contractEvent.id],
    ],
    content: JSON.stringify(newState),
  });

  return updatedStateEvent;
}

// Helper function to load machine from event
export function loadMachineFromEvent(contractEvent: NostrEvent) {
  const machineDefinition = JSON.parse(contractEvent.content);
  const machine = createMachine(
    {
      ...machineDefinition,
    },
    {
      actions: {
        assignExecutor,
      },
      guards: {
        isNotCreator,
        isCreator,
        isExecutor,
        isCreatorOrExecutor,
        isReceiver,
      },
    },
  );

  return machine;
}

// Helper function to simulate state transition
export function simulateTransition(
  contractEvent: NostrEvent,
  stateEvent: NostrEvent,
  transitionEvent: NostrEvent,
) {
  // Extract event type from the 't' tag
  const eventType = transitionEvent.tags.find(
    (tag: string[]) => tag[0] === "t",
  )?.[1];
  if (!eventType) {
    throw new Error("Transition event missing 't' tag");
  }

  // Extract inputter pubkey from the event author (already in hex format)
  const inputterPubKey = transitionEvent.pubkey;

  const loadedMachine = loadMachineFromEvent(contractEvent);
  const loadedState = JSON.parse(stateEvent.content);
  const service = createActor(loadedMachine, { snapshot: loadedState }).start();

  service.send({
    type: eventType,
    inputterPubKey,
  });

  const newSnapshot = service.getSnapshot();
  const persistedState = service.getPersistedSnapshot();

  return { service, newSnapshot, persistedState };
}

/**
 * Creates a new delivery contract and its initial state snapshot.
 * @param signer The signer for the creator.
 * @param d_tag The unique identifier for the replaceable event.
 * @param receiverPk The public key of the receiver.
 * @param title The title of the delivery.
 * @param description The description of the delivery.
 * @param additionalTags Any additional tags for the contract event.
 * @returns An object containing the contractEvent (Kind 7500) and stateEvent (Kind 30078).
 */
export async function createDeliveryContractAndInitialState(
  signer: NostrSigner,
  d_tag: string,
  receiverPk: string,
  title: string,
  description: string,
  additionalTags: string[][] = [],
): Promise<DeliveryContractResult> {
  const creatorPk = await signer.getPublicKey();
  const machineDefinition = createAtobMachineDefinition(creatorPk, receiverPk);
  const sm_pub = additionalTags.find((tag) => tag[0] === "sm_pub");
  const contractEvent = await createContractEvent(
    signer,
    d_tag,
    machineDefinition,
    title,
    description,
    additionalTags,
  );

  // Create enhanced contract event if sm_pub exists
  const enhancedContractEvent: EnhancedNostrEvent = {
    ...contractEvent,
    ...(sm_pub && { sm_pub: sm_pub[1] }),
  };

  const initialState = getInitialSnapshot(contractEvent);

  const stateEvent = await createStateEvent(
    signer,
    d_tag,
    contractEvent,
    initialState,
  );

  // Create enhanced state event if sm_pub exists
  const enhancedStateEvent: EnhancedNostrEvent = {
    ...stateEvent,
    ...(sm_pub && { sm_pub: sm_pub[1] }),
  };

  return {
    contractEvent: enhancedContractEvent,
    stateEvent: enhancedStateEvent,
  };
}

/**
 * Creates the initial state snapshot from a contract event.
 * @param contractEvent The Kind 7500 contract event.
 * @returns The initial persisted state snapshot.
 */
export function getInitialSnapshot(contractEvent: NostrEvent) {
  const machine = loadMachineFromEvent(contractEvent);
  const actor = createActor(machine).start();
  return actor.getPersistedSnapshot();
}
