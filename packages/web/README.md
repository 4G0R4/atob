# atob Web App

This directory contains the source code for the AtoB web application, a SvelteKit client for the **AtoB Delivery Protocol**. It provides a user-friendly interface for creating, managing, and participating in peer-to-peer physical package deliveries over Nostr.

The web app serves as a reference implementation and a practical demonstration of how to use the [`@atob/protocol`](../lib/README.md) library to build a client for the AtoB protocol.

## Features

- **Create and Manage Deliveries**: Users can create new delivery offers, specifying details such as pickup and drop-off locations, compensation, and deadlines.
- **Accept and Fulfill Deliveries**: Users can browse available delivery offers, accept them, and manage the delivery process through the state machine.
- **Real-Time Updates**: The app listens for Nostr events to provide real-time updates on the status of deliveries.
- **Nostr Integration**: The app uses Nostr for all communication, ensuring a decentralized and censorship-resistant experience.

## Tech Stack

- **[Bun](https://bun.sh/)**: A fast JavaScript all-in-one toolkit used as the package manager and runtime.
- **[SvelteKit](https://kit.svelte.dev/)**: The web framework for building the user interface.
- **[Svelte 5](https://svelte.dev/)**: The latest version of Svelte using the new runes API for reactive state management.
- **[TypeScript](https://www.typescriptlang.org/)**: For type safety and a better developer experience.
- **[@atob/protocol](../lib/README.md)**: The core library for handling the AtoB protocol logic.
- **[Tailwind CSS](https://tailwindcss.com/)**: For styling the user interface.

### Svelte 5 API

The main Svelte 5 runes and their implementation details are as follows:

- **$state**: Declares reactive state variables in a component. It replaces the implicit reactivity of previous versions by explicitly marking variables as reactive. Example usage:

  ```svelte
  <script>
  	let count = $state(0);
  </script>

  <button onclick={() => count++}>Count: {count}</button>
  ```

  Changes to `$state` variables trigger UI updates automatically.

- **$derived**: Computes values based on reactive state variables. These derived values update automatically when their dependencies change and are memoized to avoid unnecessary recalculations. Example:

  ```svelte
  <script>
  	let number = $state(0);
  	const squared = $derived(number * number);
  </script>

  <input type="number" bind:value={number} /><p>Squared: {squared}</p>
  ```

- **$effect**: Runs side effects whenever dependencies change. The function inside `$effect` runs after reactive values it accesses change. It is used for tasks like validation or triggering alerts based on state. Example:

  ```svelte
  <script>
  	let username = $state('');
  	let isValid = $state(true);
  	$effect(() => {
  		isValid = username.length > 3 && username.length < 10;
  	});
  </script>

  <input bind:value={username} />
  {#if isValid}
  	<p>Username is valid!</p>
  {:else}
  	<p>Username is invalid!</p>
  {/if}
  ```

- **$host**: When compiling a component as a custom element, the `$host` rune provides access to the host element, allowing you to (for example) dispatch custom events. Example:

  ```svelte
  <!-- Stepper.svelte -->
  <svelte:options customElement="my-stepper" />

  <script lang="ts">
  	function dispatch(type) {
  		$host().dispatchEvent(new CustomEvent(type));
  	}
  </script>

  <button onclick={() => dispatch('decrement')}>decrement</button>
  <button onclick={() => dispatch('increment')}>increment</button>
  ```

  ```svelte
  <!-- App.svelte -->
  <script lang="ts">
  	import './Stepper.svelte';

  	let count = $state(0);
  </script>

  <my-stepper ondecrement={() => (count -= 1)} onincrement={() => (count += 1)}></my-stepper>

  <p>count: {count}</p>
  ```

## Getting Started

To run the web app locally, you'll need to meet a few requirements.

### Understanding Data Loading Patterns

The AtoB web app uses specific patterns for loading and managing Nostr events. For detailed information about the data loading architecture, including the event store, loaders, and real-time subscriptions, see the [Data Loading Patterns](./DATA_LOADING_PATTERNS.md) documentation.

### Requirements

- **[Bun](https://bun.sh/)**: A fast JavaScript all-in-one toolkit.
- **[nak](https://github.com/fiatjaf/nak)**: A Nostr relay written in Go. This or any other relay can be used for local development.

Install `nak` by following the instructions in its repository.

### Running the App

1.  **Install dependencies:**

    From the root of the monorepo, run:

    ```bash
    bun install
    ```

2.  **Run a local relay:**

    For local development, the app is configured to connect to a relay running on `ws://localhost:10547`. We recommend using `nak` for this.

    Open a new terminal and run:

    ```bash
    nak serve
    ```

    This will start a local Nostr relay on port `10547`.

    _Note: If you prefer to use a different relay, you can configure its URL in the [`devRelay`](./src/lib/services/relay-pool.ts:17) variable inside `packages/web/src/lib/services/relay-pool.ts`._

3.  **(Optional) Populate the dev relay with sample data:**

    If you want to start with some sample delivery data, you can run the seed script:

    ```bash
    bun run seed
    ```

    This will populate your local relay with sample deliveries and accounts for testing purposes.

4.  **Run the development server:**

    Navigate to this directory (`packages/web`) and start the development server:

    ```bash
    bun run dev
    ```

    This will start the web application, which you can access in your browser at `http://localhost:5173`.

## Building for Production

To create a production version of the app, you can run the following command:

```bash
bun run build
```

This will create an optimized version of the app in the `build` directory. You can preview the production build with `bun run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.
