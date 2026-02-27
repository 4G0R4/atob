import type { EventTemplate, NostrEvent } from 'nostr-tools';
import {
	decode,
	npubEncode,
	nprofileEncode,
	noteEncode,
	neventEncode,
	type NostrTypeGuard,
	type DecodedResult
} from 'nostr-tools/nip19';
import { isHexKey } from 'applesauce-core/helpers';
import { activeAccount } from './services/accountManager.svelte';
import { toast } from 'svelte-sonner';
import { relayStore } from './stores/relay-store.svelte';
import { eventStore } from './services/eventStore';
import type { ISigner } from 'applesauce-signers';
import { relayPool } from './services/relay-pool';

/**
 * Create and sign a Nostr event.
 * @param signer The signer to use
 * @param event The event template
 * @returns The signed Nostr event
 */
export async function createEvent(signer: ISigner, event: EventTemplate): Promise<NostrEvent> {
	const signedEvent = await signer.signEvent(event);
	return signedEvent;
}

/**
 * Sign an event with the active account
 * @param event The event to sign
 * @returns The signed event
 */
export async function signEvent(event: EventTemplate): Promise<NostrEvent | undefined> {
	if (!activeAccount.value) {
		toast.error('Please log in to sign this event.');
	}
	const signedEvent = await activeAccount.value?.signer.signEvent(event);
	return signedEvent;
}

/*
 * Publish an event to the selected relays
 */
export async function publishEvent(
	event: NostrEvent,
	relays: string[] = []
): Promise<string | undefined> {
	try {
		// Convert to plain object by manually constructing each field
		// This ensures no proxies, getters, or Blob objects are included
		const plainEvent = {
			id: String(event.id || ''),
			pubkey: String(event.pubkey || ''),
			created_at: Number(event.created_at || 0),
			kind: Number(event.kind || 0),
			tags: (event.tags || []).map((tag) =>
				(Array.isArray(tag) ? tag : [tag]).map((item) => String(item))
			),
			content: String(event.content || ''),
			sig: String(event.sig || '')
		};

		console.log('Publishing plain event:', plainEvent);

		// Create the Nostr EVENT message as a JSON string
		const eventMessage = JSON.stringify(['EVENT', plainEvent]);
		console.log('Event message to send:', eventMessage);

		const results = await relayPool.publish(
			relays.length ? relays : relayStore.selectedRelays,
			plainEvent
		);
		const successful = results.filter((r) => r.ok);
		if (successful.length > 0) {
			console.log(`Event ${event.id} published successfully to ${successful.length} relay(s)`);
			eventStore.add(plainEvent);
			return event.id;
		} else {
			console.log(`Failed to publish event ${event.id} to any relays`);
			console.log('Results:', results);
		}
	} catch (error) {
		console.error(`Error publishing event ${event.id} to relays:`, error);
		throw error;
	}
}

/**
 * Validates and decodes a nostr identifier (hex pubkey, npub, or nprofile)
 * @param identifier The identifier to validate and decode
 * @returns The hex pubkey if valid, null otherwise
 */
export function validateAndDecodePubkey(identifier: string): string | null {
	if (!identifier) return null;

	// Check if it's a hex pubkey
	if (isHexKey(identifier)) {
		return identifier;
	}

	try {
		// Try to decode as nip19
		const { type, data } = decode(identifier);

		if (type === 'npub') {
			return data as string;
		} else if (type === 'nprofile') {
			const profile = data as { pubkey: string; relays?: string[] };
			return profile.pubkey;
		}
	} catch (error) {
		// Invalid nip19 format
		return null;
	}

	return null;
}

/**
 * Encodes a hex pubkey to npub format
 * @param hexPubkey The hex pubkey to encode
 * @returns The npub encoded string
 */
export function encodeNpub(hexPubkey: string): string {
	return npubEncode(hexPubkey);
}

/**
 * Encodes a hex pubkey and optional relays to nprofile format
 * @param hexPubkey The hex pubkey to encode
 * @param relays Optional array of relay URLs
 * @returns The nprofile encoded string
 */
export function encodeNprofile(hexPubkey: string, relays?: string[]): string {
	return nprofileEncode({ pubkey: hexPubkey, relays: relays || [] });
}

/**
 * Type guard functions for nostr identifiers
 */
export const NostrIdentifierTypeGuard: {
	isNpub: (value: string) => boolean;
	isNprofile: (value: string) => boolean;
	isHexPubkey: (value: string) => boolean;
	isValidPubkeyIdentifier: (value: string) => boolean;
} = {
	isNpub: (value: string): boolean => {
		if (!value) return false;
		try {
			const { type } = decode(value);
			return type === 'npub';
		} catch {
			return false;
		}
	},

	isNprofile: (value: string): boolean => {
		if (!value) return false;
		try {
			const { type } = decode(value);
			return type === 'nprofile';
		} catch {
			return false;
		}
	},

	isHexPubkey: (value: string): boolean => {
		return isHexKey(value);
	},

	isValidPubkeyIdentifier: (value: string): boolean => {
		return validateAndDecodePubkey(value) !== null;
	}
};

/**
 * Gets a display-friendly representation of a pubkey identifier
 * @param identifier The pubkey identifier (hex, npub, or nprofile)
 * @returns A shortened display string
 */
export function getPubkeyDisplay(identifier: string): string {
	if (!identifier) return '';

	if (NostrIdentifierTypeGuard.isHexPubkey(identifier)) {
		return `${identifier.slice(0, 6)}...${identifier.slice(-6)}`;
	}

	if (NostrIdentifierTypeGuard.isNpub(identifier)) {
		return `${identifier.slice(0, 12)}...${identifier.slice(-6)}`;
	}

	if (NostrIdentifierTypeGuard.isNprofile(identifier)) {
		return `${identifier.slice(0, 14)}...${identifier.slice(-6)}`;
	}

	return identifier.slice(0, 12) + (identifier.length > 12 ? '...' : '');
}

/**
 * Validates and decodes a nostr event identifier (hex event ID, note, or nevent)
 * @param identifier The identifier to validate and decode
 * @returns The hex event ID if valid, null otherwise
 */
export function validateAndDecodeEventId(identifier: string): DecodedResult | null {
	if (!identifier) return null;
	// Check if it's a hex event ID (64 characters)
	if (identifier.length === 64 && /^[0-9a-fA-F]+$/.test(identifier)) {
		const decoded: DecodedResult = { type: 'nevent', data: { id: identifier } };
		return decoded;
	}

	try {
		// Try to decode as nip19
		const decoded = decode(identifier);

		if (decoded) {
			return decoded;
		}
	} catch (error) {
		// Invalid nip19 format
		return null;
	}

	return null;
}

/**
 * Type guard functions for nostr event identifiers
 */
export const NostrEventTypeGuard: {
	isNote: (value: string) => boolean;
	isNevent: (value: string) => boolean;
	isHexEventId: (value: string) => boolean;
	isValidEventIdentifier: (value: string) => boolean;
} = {
	isNote: (value: string): boolean => {
		if (!value) return false;
		try {
			const { type } = decode(value);
			return type === 'note';
		} catch {
			return false;
		}
	},

	isNevent: (value: string): boolean => {
		if (!value) return false;
		try {
			const { type } = decode(value);
			return type === 'nevent';
		} catch {
			return false;
		}
	},

	isHexEventId: (value: string): boolean => {
		return value.length === 64 && /^[0-9a-fA-F]+$/.test(value);
	},

	isValidEventIdentifier: (value: string): boolean => {
		return validateAndDecodeEventId(value) !== null;
	}
};

/**
 * Encodes a hex event ID to note format
 * @param hexEventId The hex event ID to encode
 * @returns The note encoded string
 */
export function encodeNote(hexEventId: string): string {
	return noteEncode(hexEventId);
}

/**
 * Encodes a hex event ID and optional relays to nevent format
 * @param hexEventId The hex event ID to encode
 * @param relays Optional array of relay URLs
 * @param kind Optional event kind
 * @returns The nevent encoded string
 */
export function encodeNevent(hexEventId: string, relays?: string[], kind?: number): string {
	return neventEncode({ id: hexEventId, relays: relays || [], kind });
}

/**
 * Gets a display-friendly representation of an event identifier
 * @param identifier The event identifier (hex, note, or nevent)
 * @returns A shortened display string
 */
export function getEventDisplay(identifier: string): string {
	if (!identifier) return '';

	if (NostrEventTypeGuard.isHexEventId(identifier)) {
		return `${identifier.slice(0, 6)}...${identifier.slice(-6)}`;
	}

	if (NostrEventTypeGuard.isNote(identifier)) {
		return `${identifier.slice(0, 12)}...${identifier.slice(-6)}`;
	}

	if (NostrEventTypeGuard.isNevent(identifier)) {
		return `${identifier.slice(0, 14)}...${identifier.slice(-6)}`;
	}

	return identifier.slice(0, 12) + (identifier.length > 12 ? '...' : '');
}
