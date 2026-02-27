# @atob/protocol

This package provides a TypeScript implementation of the **AtoB Delivery Protocol**, a system for coordinating peer-to-peer physical package deliveries over Nostr. It is designed to be a reference library for any client that wants to build on or interact with the AtoB protocol.

The library is built on top of [XState](https://xstate.js.org/) and provides the core components needed to manage the lifecycle of a delivery, including the state machine, guards, and actions.

## Features

- **State Machine**: A pre-built XState machine that models the entire delivery process, from creation to completion.
- **Guards and Actions**: A suite of pluggable guards and actions that enforce the protocol's rules and manage state transitions.
- **Type-Safe**: Written in TypeScript to ensure type safety and provide a better developer experience.
- **Nostr Integration**: Includes utilities for creating, signing, and parsing Nostr events related to the AtoB protocol.

## The Protocol

The AtoB protocol is a specific application of the general-purpose [State Machines on Nostr](../../spec/state-machines-on-nostr.md) specification. It models a delivery as a state machine with the following key actors:

- **Creator**: The user who creates the delivery offer.
- **Executor**: The user who accepts and completes the delivery.

For a detailed understanding of the protocol, please refer to the following documents:

- **[State Machines on Nostr](../../spec/state-machines-on-nostr.md)**: The foundational protocol.
- **[AtoB Delivery Protocol](../../spec/atob-delivery-protocol.md)**: The specific implementation for deliveries.

## Installation

To install the library, you can use your favorite package manager:

```bash
bun add @atob/protocol
```

## Usage

The core of the library is the `atobMachine`, an XState machine that you can use to manage the state of a delivery. Here's a basic example of how to use it:

```typescript
import { createMachine } from "xstate";
import {
  assignExecutor,
  isCreator,
  isExecutor,
  isNotCreator,
  isCreatorOrExecutor,
  isReceiver,
} from "@atob/protocol";

// The state machine definition from a Nostr event (Kind 7500)
const atobMachineDefinition = {
  /* ... */
};

// Create the XState machine with the imported implementations
const atobMachine = createMachine(atobMachineDefinition, {
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
});

// The 'atobMachine' can now be used with an XState interpreter.
```

For a complete example of how to use this library in a real-world application, please refer to the `packages/web` directory, which contains a Svelte-based web app that uses this library.
