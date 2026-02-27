import { assign } from "xstate";

export const stateMachineDefinitionKind: number = 7500;
export const stateMachineTransitionKind: number = 7501;
export const stateMachineSnapshotKind: number = 30078;
export const publicOfferKind: number = 37500;

export type AtobContext = {
  creatorPubKey: string;
  executorPubKey?: string | null;
  receiverPubKey?: string | null;
  inputterPubKey?: string | null;
};

export type AtobEvent = {
  type: string;
  inputterPubKey: string;
};

/**
 * Assigns the `inputterPubKey` from the event to the `executorPubKey` in the context.
 */
export const assignExecutor = assign({
  executorPubKey: ({ event }) => event.inputterPubKey,
});

/**
 * Checks if the `inputterPubKey` is the contract creator.
 */
export const isCreator = ({ context, event }: any) =>
  event.inputterPubKey === context.creatorPubKey;

/**
 * Checks if the `inputterPubKey` is not the contract creator.
 */
export const isNotCreator = ({ context, event }: any) =>
  !isCreator({ context, event });

/**
 * Checks if the `inputterPubKey` is the assigned executor.
 */
export const isExecutor = ({ context, event }: any) =>
  event.inputterPubKey === context.executorPubKey;

/**
 * Checks if the `inputterPubKey` is the designated receiver.
 */
export const isReceiver = ({ context, event }: any) =>
  event.inputterPubKey === context.receiverPubKey;

/**
 * Checks if the `inputterPubKey` is either the creator or the executor.
 */
export const isCreatorOrExecutor = ({ context, event }: any) =>
  isCreator({ context, event }) || isExecutor({ context, event });
