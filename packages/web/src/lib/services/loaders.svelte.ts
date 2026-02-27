import {
	createAddressLoader,
	createEventLoader,
	createTimelineLoader
} from 'applesauce-loaders/loaders';
import {
	publicOfferKind,
	stateMachineDefinitionKind,
	stateMachineSnapshotKind,
	stateMachineTransitionKind
} from '@atob/lib';
import { relayStore } from '$lib/stores/relay-store.svelte';
import { relayPool } from './relay-pool';
import { eventStore } from './eventStore';
import { encryptedEventStore } from './encryptedEventStore';
import type { Filter } from 'nostr-tools';
import { GiftWrap } from 'nostr-tools/kinds';

// Filter constants for common use cases
export const deliveriesFilter: Filter = {
	kinds: [stateMachineDefinitionKind]
};

export const publicDeliveriesFilter: Filter = {
	kinds: [publicOfferKind, stateMachineDefinitionKind]
};

// Encrypted events filter (kind 1059 gift wraps)
// This filter will be dynamically created based on accessible SM public keys
export function createEncryptedEventsFilter(accessiblePubkeys: string[]): Filter {
	if (accessiblePubkeys.length === 0) {
		return { kinds: [GiftWrap] };
	}
	return {
		kinds: [GiftWrap],
		'#p': accessiblePubkeys
	};
}

// Deliveries created by the user (My Packages)
export const userCreatedDeliveriesFilter = (pubkey: string): Filter => ({
	kinds: [stateMachineDefinitionKind],
	authors: [pubkey]
});

// Deliveries the user has participated in (My Deliveries)
export const userParticipatedDeliveriesFilter = (pubkey: string): Filter => ({
	kinds: [stateMachineTransitionKind],
	authors: [pubkey]
});

// Legacy filter - keeping for backwards compatibility
export const userDeliveriesFilter = (pubkey: string): Filter => ({
	kinds: [stateMachineSnapshotKind],
	authors: [pubkey]
});

export const singleDeliveryFilter = (id: string): Filter => ({
	ids: [id]
});

export const transitionEventsFilter = (deliveryId: string): Filter => ({
	kinds: [stateMachineTransitionKind],
	'#e': [deliveryId]
});

export const stateSnapshotFilter = (kind: number, pubkey: string, identifier: string): Filter => ({
	kinds: [kind],
	authors: [pubkey],
	'#d': [identifier]
});

// Create address loader
export const addressLoader = createAddressLoader(relayPool, { eventStore });

// Create an event loader
export const eventLoader = createEventLoader(relayPool, {
	eventStore
});

// Create encrypted events loader factory function
export function createEncryptedEventsLoader(accessiblePubkeys: string[]) {
	const filter = createEncryptedEventsFilter(accessiblePubkeys);
	return createTimelineLoader(relayPool, relayStore.selectedRelays, filter, {
		eventStore
	});
}

// Function to create a deliveries loader for a specific user
export const createTimelineLoaderByFilter = (filter: Filter) => {
	const loader = createTimelineLoader(relayPool, relayStore.selectedRelays, filter, {
		eventStore
	});

	const observable = loader();

	return observable;
};

// Function to start encrypted events processing
export async function startEncryptedEventsProcessing(accessiblePubkeys: string[]): Promise<void> {
	if (accessiblePubkeys.length === 0) {
		console.log('No accessible SM public keys found, skipping encrypted events processing');
		return;
	}

	const encryptedEventsLoader = createEncryptedEventsLoader(accessiblePubkeys);
	const encryptedEventsObservable = encryptedEventsLoader();
	encryptedEventsObservable.subscribe({
		next: async (event) => {
			// Process encrypted events and add decrypted events to the store
			await encryptedEventStore.processEncryptedEvent(event);
		},
		error: (error) => {
			console.error('Error processing encrypted events:', error);
		}
	});
}
