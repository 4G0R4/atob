<script lang="ts">
	import type { Delivery } from '$lib/models/delivery';
	import { type Event } from 'nostr-tools';
	import {
		createTransitionEvent,
		loadMachineFromEvent,
		simulateTransition,
		createStateEvent
	} from '@atob/lib';
	import { activeAccount } from '$lib/services/accountManager.svelte';
	import { keyPackManager } from '$lib/services/keyPackManager.svelte';
	import { encryptedEventStore } from '$lib/services/encryptedEventStore';
	import Button from '$lib/components/ui/button/button.svelte';
	import { toast } from 'svelte-sonner';
	import { createActor, type Actor } from 'xstate';
	import StateSnapshot from '$lib/components/StateSnapshot.svelte';
	import TransitionEvents from '$lib/components/TransitionEvents.svelte';
	import ProfileCard from '$lib/components/ProfileCard.svelte';
	import { publishEvent } from '$lib/utils.nostr';
	import SingleDeliveryMap from '$lib/components/SingleDeliveryMap.svelte';
	import { capitalize } from '$lib/utils';
	import { ArrowLeft } from 'lucide-svelte';
	import EncryptionBadge from './EncryptionBadge.svelte';

	let { delivery }: { delivery: Delivery } = $props();

	let deliveryStateEvent: Event | undefined = $state(undefined);
	let localStateEvent: Event | undefined = $state(undefined);
	// Define machine type for clarity
	type AtobMachine = ReturnType<typeof loadMachineFromEvent>;
	let machine: AtobMachine | undefined = $state(undefined);
	let actor: Actor<AtobMachine> | undefined = $state(undefined);

	$effect(() => {
		if (!delivery) return;
		machine = loadMachineFromEvent(delivery.rawEvent);
	});

	$effect(() => {
		if (!deliveryStateEvent || !machine) return;
		try {
			const persistedState = JSON.parse(deliveryStateEvent.content);
			// Create a new actor with the loaded snapshot and start it
			actor = createActor(machine, { snapshot: persistedState }).start();
		} catch (e) {
			console.error('Failed to parse or load state snapshot', e);
			// If parsing fails, start the machine in its initial state
			actor = createActor(machine).start();
		}
	});

	async function handleTransition(eventType: string) {
		if (!delivery) {
			toast.error('Cannot publish transition: delivery not found');
			return;
		}

		if (!$activeAccount) {
			toast.error('Please log in to perform this action.');
			return;
		}

		try {
			const transitionEvent = await createTransitionEvent(
				$activeAccount.signer,
				delivery.rawEvent.id,
				eventType
			);

			// Check if delivery is encrypted and handle encryption
			if (delivery.sm_pub) {
				const sm_sec = keyPackManager.getKey(delivery.sm_pub);
				if (sm_sec) {
					// Encrypt and wrap the transition event
					const encryptedTransitionEvent = await encryptedEventStore.encryptAndWrapEvent(
						transitionEvent,
						sm_sec,
						delivery.sm_pub
					);
					if (!encryptedTransitionEvent) {
						toast.error('Failed to encrypt transition event.');
						return;
					}
					await publishEvent(encryptedTransitionEvent);
					toast.success('Encrypted transition event published!');
				} else {
					toast.error('You do not have access to publish encrypted transitions for this delivery.');
					return;
				}
			} else {
				// Publish normally for non-encrypted deliveries
				await publishEvent(transitionEvent);
				toast.success('Transition event published!');
			}
		} catch (error) {
			console.error('Failed to publish transition event:', error);
			toast.error('Failed to publish transition event. Please try again.');
		}
	}

	async function handleSend(transitionEvent: Event) {
		const stateEvent = deliveryStateEvent;
		if (!delivery || !stateEvent || !actor || !$activeAccount) {
			return;
		}

		// Note: The transitionEvent parameter should already be decrypted if it came from an encrypted delivery
		// The encryptedEventStore.processEncryptedEvent function handles decryption before passing events to components

		const { newSnapshot, persistedState } = simulateTransition(
			delivery.rawEvent,
			stateEvent,
			transitionEvent
		);

		if (newSnapshot.value !== actor.getSnapshot().value) {
			const d_tag = delivery.state.split(':').pop();
			if (!d_tag) {
				console.error('Could not find d tag');
				return;
			}

			const newStateEvent = await createStateEvent(
				$activeAccount.signer,
				d_tag,
				delivery.rawEvent,
				persistedState
			);

			localStateEvent = newStateEvent;
			toast.success('State simulated successfully!');
		} else {
			toast.info('Simulation resulted in no state change.');
		}
	}

	async function handleStore() {
		if (!localStateEvent) {
			toast.error('No state event to store');
			return;
		}

		try {
			// Check if delivery is encrypted and handle encryption
			if (delivery.sm_pub) {
				const sm_sec = keyPackManager.getKey(delivery.sm_pub);
				if (sm_sec) {
					// Encrypt and wrap the state event
					const encryptedStateEvent = await encryptedEventStore.encryptAndWrapEvent(
						localStateEvent,
						sm_sec,
						delivery.sm_pub
					);
					if (!encryptedStateEvent) {
						toast.error('Failed to encrypt state event.');
						return;
					}
					await publishEvent(encryptedStateEvent);
					toast.success('Encrypted state stored successfully!');
				} else {
					toast.error('You do not have access to store encrypted state for this delivery.');
					return;
				}
			} else {
				// Publish normally for non-encrypted deliveries
				await publishEvent(localStateEvent);
				toast.success('State stored successfully!');
			}
			localStateEvent = undefined;
		} catch (error) {
			console.error('Failed to store state event:', error);
			toast.error('Failed to store state event. Please try again.');
		}
	}

	function getNextEvents(actorInstance: Actor<AtobMachine>): string[] {
		if (!machine) return [];
		const snapshot = actorInstance.getSnapshot();
		// The snapshot might not be initialized yet
		if (!snapshot.value) return [];
		const stateValue = snapshot.value as string;
		const stateDefinition = (machine.definition.states as Record<string, any>)[stateValue];
		if (stateDefinition && stateDefinition.on) {
			return Object.keys(stateDefinition.on);
		}
		return [];
	}
</script>

<div class="space-y-6">
	<!-- Back Button -->
	<div class="flex justify-start">
		<Button
			variant="outline"
			onclick={() => window.history.back()}
			class="border-purple-400/20 bg-black/20 text-purple-300 hover:border-purple-400/30 hover:bg-purple-400/10"
		>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back
		</Button>
	</div>

	<!-- Mobile Map at Top -->
	<div class="card-cyberpunk overflow-hidden lg:hidden" style="height: 50dvh;">
		<SingleDeliveryMap delivery={delivery.rawEvent} />
	</div>

	<!-- Two Column Layout: Details (Left) + Map (Right on Desktop) -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2" style="height: calc(100dvh - 200px);">
		<!-- Left: Details (Mobile: full page scroll, Desktop: scrollable) -->
		<div class="flex min-h-0 flex-col">
			<div class="space-y-6 pb-20 lg:flex-1 lg:overflow-y-auto lg:pr-2 lg:pb-0">
				<div class="card-cyberpunk space-y-4 p-6">
					<div>
						{#if delivery.sm_pub}
							<EncryptionBadge isEncrypted={true} />
						{/if}
						<h2 class="text-off-white mb-2 text-2xl font-bold">{delivery.title}</h2>
						<p class="text-adaptive-gray">{delivery.description}</p>
					</div>
					<div class="space-y-4">
						<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
							<div class="flex flex-col">
								<span class="font-semibold text-gray-400">Amount</span>
								<span class="text-off-white">{delivery.amount} {delivery.currency || 'SATS'}</span>
							</div>
							<div class="flex flex-col">
								<span class="font-semibold text-gray-400">Pickup</span>
								<span class="text-off-white">{delivery.pickup_geohash}</span>
							</div>
							<div class="flex flex-col">
								<span class="font-semibold text-gray-400">Dropoff</span>
								<span class="text-off-white">{delivery.dropoff_geohash}</span>
							</div>
						</div>

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<ProfileCard pubkey={delivery.creator} role="Creator" />
							<ProfileCard pubkey={delivery.receiver} role="Receiver" />
						</div>
					</div>
				</div>

				<StateSnapshot {delivery} bind:deliveryStateEvent />

				{#if actor && $activeAccount}
					<div class="card-cyberpunk space-y-4 p-6">
						<div>
							<h2 class="text-off-white mb-2 text-xl font-bold">Next Actions</h2>
							<p class="text-adaptive-gray text-sm">
								The following actions are available based on the current state of the delivery.
							</p>
						</div>
						<div class="flex flex-wrap gap-2">
							{#each getNextEvents(actor) as nextEvent}
								<Button onclick={() => handleTransition(nextEvent)}>{capitalize(nextEvent)}</Button>
							{/each}
						</div>
					</div>
				{/if}

				{#if localStateEvent}
					<StateSnapshot
						{delivery}
						deliveryStateEvent={localStateEvent}
						title="Local State"
						isLocal={true}
					>
						<div class="p-4">
							<Button onclick={handleStore}>Store</Button>
						</div>
					</StateSnapshot>
				{/if}

				<TransitionEvents {delivery} onSend={handleSend} deliveryState={deliveryStateEvent} />
			</div>
		</div>

		<!-- Right: Map View (Desktop Only) -->
		<div class="card-cyberpunk hidden overflow-hidden lg:block">
			<SingleDeliveryMap delivery={delivery.rawEvent} />
		</div>
	</div>
</div>
