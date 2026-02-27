import { relayPool } from './relay-pool';
import { relayStore } from '$lib/stores/relay-store.svelte';
import { keyPackManager } from './keyPackManager.svelte';
import {
	decryptStateMachineEvent,
	encryptStateMachineEvent,
	GIFT_WRAP_KIND
} from '$lib/utils/encryption';
import type { Filter, Event } from 'nostr-tools';
import { lastValueFrom, toArray } from 'rxjs';
import { eventStore } from './eventStore';

class EncryptedEventStore {
	private keyPackManager = keyPackManager;

	/**
	 * Query for encrypted events user can access
	 */
	async queryEncryptedEvents(): Promise<Event[]> {
		const accessiblePubkeys = this.keyPackManager.getAccessibleSMPubkeys();
		if (accessiblePubkeys.length === 0) return [];

		const filter: Filter = {
			kinds: [GIFT_WRAP_KIND],
			'#p': accessiblePubkeys
		};

		try {
			const wrapperEvents = await lastValueFrom(
				relayPool.request(relayStore.selectedRelays, filter).pipe(toArray())
			);

			const decryptedEvents: Event[] = [];
			for (const wrapperEvent of wrapperEvents) {
				const decryptedEvent = await this.processEncryptedEvent(wrapperEvent);
				if (decryptedEvent) {
					decryptedEvents.push(decryptedEvent);
				}
			}

			return decryptedEvents;
		} catch (error) {
			console.error('Error querying encrypted events:', error);
			return [];
		}
	}

	/**
	 * Process incoming encrypted events
	 */
	async processEncryptedEvent(wrapperEvent: Event): Promise<Event | null> {
		if (wrapperEvent.kind !== GIFT_WRAP_KIND) {
			return null;
		}

		// Extract sm_pub from event tags
		const smPubTag = wrapperEvent.tags.find((tag) => tag[0] === 'p');
		if (!smPubTag || !smPubTag[1]) {
			return null;
		}

		const sm_pub = smPubTag[1];

		// Check if user has access to this encrypted delivery
		const sm_sec = this.keyPackManager.getKey(sm_pub);
		if (!sm_sec) {
			return null;
		}

		try {
			// Decrypt the inner event
			const result = decryptStateMachineEvent(wrapperEvent, sm_sec, sm_pub);
			if (!result.success || !result.event) {
				console.warn('Failed to decrypt encrypted event:', result.error);
				return null;
			}

			// Add sm_pub to the inner event for identification
			const enhancedEvent = {
				...result.event,
				sm_pub
			};
			return eventStore.add(enhancedEvent);
		} catch (error) {
			console.warn('Failed to process encrypted event:', error);
			return null;
		}
	}

	/**
	 * Encrypt and wrap a state machine event for publishing
	 */
	async encryptAndWrapEvent(
		innerEvent: Event,
		sm_sec: string,
		sm_pub: string
	): Promise<Event | null> {
		const result = encryptStateMachineEvent(innerEvent, sm_sec, sm_pub);
		if (!result.success || !result.event) {
			console.warn('Failed to encrypt event:', result.error);
			return null;
		}

		// Store the encrypted event in the main event store so it is accessible immediately
		eventStore.add(innerEvent);
		return result.event;
	}
}

// Create and export singleton instance
export const encryptedEventStore = new EncryptedEventStore();
