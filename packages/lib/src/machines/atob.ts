// TODO: Add more state machines to adapt to the new flow based on public offers. We should be able to have different state machines and manage them properly in our lib to export them and so on
// Standard state machine definition for AtoB delivery
export function createAtobMachineDefinition(
  creatorPk: string,
  receiverPk: string,
  executorPk: string | null = null,
) {
  console.log("🏗️ Creating AtoB machine definition...");
  const definition = {
    id: "atob-delivery",
    initial: "created",
    context: {
      creatorPubKey: creatorPk,
      executorPubKey: executorPk,
      receiverPubKey: receiverPk,
      inputterPubKey: null as string | null,
    },
    states: {
      created: {
        on: {
          ACCEPT: {
            target: "accepted",
            guard: "isNotCreator",
            actions: "assignExecutor",
          },
          CANCEL: {
            target: "canceled",
            guard: "isCreator",
          },
        },
      },
      accepted: {
        on: {
          START_TRANSIT: {
            target: "in_transit",
            guard: "isExecutor",
          },
          CANCEL: {
            target: "canceled",
            guard: "isCreatorOrExecutor",
          },
        },
      },
      in_transit: {
        on: {
          DELIVER: {
            target: "delivered",
            guard: "isExecutor",
          },
          DISPUTE: {
            target: "disputed",
            guard: "isCreatorOrExecutor",
          },
        },
      },
      delivered: {
        on: {
          CONFIRM_DELIVERY: {
            target: "completed",
            guard: "isReceiver",
          },
        },
      },
      completed: {
        type: "final" as const,
      },
      canceled: {
        type: "final" as const,
      },
      disputed: {},
    },
  };

  console.log(
    "✅ Machine definition created with initial state:",
    definition.initial,
  );
  return definition;
}
