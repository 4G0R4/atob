# atob

This monorepo contains the reference implementation for the **AtoB Delivery Protocol**, a system for coordinating peer-to-peer physical package deliveries over Nostr.

The protocol is a specific application of the general-purpose [State Machines on Nostr](./spec/state-machines-on-nostr.md) specification, which allows for creating and managing verifiable, self-contained state machines in a decentralized environment.

## The Protocol

The AtoB protocol models a delivery process as a state machine, enabling a `creator` to offer a delivery job and an `executor` to accept and complete it. The entire lifecycle—from creation to completion—is managed through Nostr events, ensuring a transparent and auditable trail.

- **[State Machines on Nostr](./spec/state-machines-on-nostr.md)**: The foundational protocol for creating verifiable state machines on Nostr.
- **[AtoB Delivery Protocol](./spec/atob-delivery-protocol.md)**: The specific implementation for p2p package deliveries.

## Packages

This monorepo is organized into the following packages:

- **`packages/lib`**: A TypeScript library that provides the core logic for the AtoB protocol, including the state machine definition, guards, and actions. It is designed to be used by any client that wants to implement the AtoB protocol.
- **`packages/web`**: A SvelteKit web application that provides a user interface for creating and managing AtoB deliveries. It uses the `@atob/protocol` library to handle the protocol logic.

## Getting Started

To get started with this project, you'll need to have [Bun](https://bun.sh/) installed.

1.  **Install dependencies:**

    ```bash
    bun install
    ```

2.  **Run the web app:**

    Navigate to the `packages/web` directory and start the development server:

    ```bash
    cd packages/web
    bun run dev
    ```

This will start the web application, which you can access in your browser to interact with the AtoB protocol.
