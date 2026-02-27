import { test, expect } from "bun:test";
import { verifyEvent } from "nostr-tools/pure";
import { createActor } from "xstate";
import {
  createAtobMachineDefinition,
  createContractEvent,
  createStateEvent,
  createTransitionEvent,
  updateStateEvent,
  loadMachineFromEvent,
  simulateTransition,
} from "./index.js";
import { PrivateKeySigner } from "./src/nostr/signers.js";

test("AtoB Delivery Flow", async () => {
  // 1. Generate keys
  const creatorSigner = new PrivateKeySigner();
  const executorSigner = new PrivateKeySigner();
  const receiverSigner = new PrivateKeySigner();
  // 2. Create state machine definition
  const atobMachineDefinition = createAtobMachineDefinition(
    await creatorSigner.getPublicKey(),
    await receiverSigner.getPublicKey(),
  );

  // 3. Create contract event
  const d_tag = "test-delivery-123";
  const contractEvent = await createContractEvent(
    creatorSigner,
    d_tag,
    atobMachineDefinition,
    "Test Delivery",
    "A test delivery for the AtoB protocol",
  );

  // 4. Create initial state
  const atobMachine = loadMachineFromEvent(contractEvent);
  const actor = createActor(atobMachine).start();
  let currentState = actor.getPersistedSnapshot();

  // 5. Create initial state event
  let stateEvent = await createStateEvent(
    creatorSigner,
    d_tag,
    contractEvent,
    currentState,
  );

  // 6. Executor accepts the offer
  const acceptEvent = await createTransitionEvent(
    executorSigner,
    contractEvent.id,
    "ACCEPT",
  );

  const {
    newSnapshot: acceptedSnapshot,
    persistedState: acceptedPersistedState,
  } = simulateTransition(contractEvent, stateEvent, acceptEvent);

  expect(acceptedSnapshot.value).toBe("accepted");
  expect(acceptedSnapshot.context.executorPubKey).toBe(
    await executorSigner.getPublicKey(),
  );

  // 7. Update state event
  stateEvent = await updateStateEvent(
    creatorSigner,
    d_tag,
    contractEvent,
    acceptedPersistedState,
  );

  // 8. Executor starts transit
  const startTransitEvent = await createTransitionEvent(
    executorSigner,
    contractEvent.id,
    "START_TRANSIT",
  );

  const {
    newSnapshot: inTransitSnapshot,
    persistedState: inTransitPersistedState,
  } = simulateTransition(contractEvent, stateEvent, startTransitEvent);

  expect(inTransitSnapshot.value).toBe("in_transit");

  // 9. Update state event
  stateEvent = await updateStateEvent(
    creatorSigner,
    d_tag,
    contractEvent,
    inTransitPersistedState,
  );

  // 10. Executor delivers the package
  const deliverEvent = await createTransitionEvent(
    executorSigner,
    contractEvent.id,
    "DELIVER",
  );

  const {
    newSnapshot: deliveredSnapshot,
    persistedState: deliveredPersistedState,
  } = simulateTransition(contractEvent, stateEvent, deliverEvent);

  expect(deliveredSnapshot.value).toBe("delivered");

  // 11. Update state event
  stateEvent = await updateStateEvent(
    creatorSigner,
    d_tag,
    contractEvent,
    deliveredPersistedState,
  );

  // 12. Receiver confirms delivery
  const confirmDeliveryEvent = await createTransitionEvent(
    receiverSigner,
    contractEvent.id,
    "CONFIRM_DELIVERY",
  );

  const {
    newSnapshot: completedSnapshot,
    persistedState: completedPersistedState,
  } = simulateTransition(contractEvent, stateEvent, confirmDeliveryEvent);

  expect(completedSnapshot.value).toBe("completed");

  // 13. Update state event to final 'completed' state
  stateEvent = await updateStateEvent(
    creatorSigner,
    d_tag,
    contractEvent,
    completedPersistedState,
  );
  expect(verifyEvent(stateEvent)).toBe(true);
});

test("AtoB Delivery Flow - Unauthorized Access", async () => {
  // 1. Generate keys
  const creatorSigner = new PrivateKeySigner();
  const executorSigner = new PrivateKeySigner();
  const receiverSigner = new PrivateKeySigner();
  const badSigner = new PrivateKeySigner();

  // 2. Create state machine definition
  const atobMachineDefinition = createAtobMachineDefinition(
    await creatorSigner.getPublicKey(),
    await receiverSigner.getPublicKey(),
  );

  // 3. Create contract event
  const d_tag = "test-delivery-unauthorized-123";
  const contractEvent = await createContractEvent(
    creatorSigner,
    d_tag,
    atobMachineDefinition,
    "Test Delivery Unauthorized",
    "A test delivery for the AtoB protocol - unauthorized access",
  );

  // 4. Create initial state
  const atobMachine = loadMachineFromEvent(contractEvent);
  const actor = createActor(atobMachine).start();
  let currentState = actor.getPersistedSnapshot();

  // 5. Create initial state event
  let stateEvent = createStateEvent(
    creatorSigner,
    d_tag,
    contractEvent,
    currentState,
  );

  // 6. Create service for testing transitions
  const service = createActor(atobMachine, {
    snapshot: currentState,
  }).start();

  // 7. Creator tries to accept their own offer
  service.send({
    type: "ACCEPT",
    inputterPubKey: await creatorSigner.getPublicKey(),
  });
  let newState = service.getSnapshot();
  expect(newState.value).toBe("created");

  // 8. Legitimate executor accepts the offer
  service.send({
    type: "ACCEPT",
    inputterPubKey: await executorSigner.getPublicKey(),
  });
  newState = service.getSnapshot();
  expect(newState.value).toBe("accepted");

  // 9. Unauthorized user tries to start transit
  service.send({
    type: "START_TRANSIT",
    inputterPubKey: await badSigner.getPublicKey(),
  });
  let newState2 = service.getSnapshot();
  expect(newState2.value).toBe("accepted");

  // 10. Executor starts transit
  service.send({
    type: "START_TRANSIT",
    inputterPubKey: await executorSigner.getPublicKey(),
  });
  newState = service.getSnapshot();
  expect(newState.value).toBe("in_transit");

  // 11. Executor delivers
  service.send({
    type: "DELIVER",
    inputterPubKey: await executorSigner.getPublicKey(),
  });
  newState = service.getSnapshot();
  expect(newState.value).toBe("delivered");

  // 12. Executor tries to confirm delivery
  service.send({
    type: "CONFIRM_DELIVERY",
    inputterPubKey: await executorSigner.getPublicKey(),
  });
  newState = service.getSnapshot();
  expect(newState.value).toBe("delivered");

  // 13. Receiver confirms delivery
  service.send({
    type: "CONFIRM_DELIVERY",
    inputterPubKey: await receiverSigner.getPublicKey(),
  });
  newState = service.getSnapshot();
  expect(newState.value).toBe("completed");
});
