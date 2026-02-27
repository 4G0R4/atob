import { nip44 } from 'nostr-tools';
import { finalizeEvent, generateSecretKey, getPublicKey, type NostrEvent } from 'nostr-tools/pure';
import type { ISigner } from 'applesauce-signers';
import { hexToBytes } from 'nostr-tools/utils';
import { validateAndDecodePubkey } from '$lib/utils.nostr';

// Constants for encryption
export const GIFT_WRAP_KIND = 1059;
export const SM_KEY_PACK_KIND = 7502;
export const NOSTR_TAGS = {
	PUBKEY: 'p'
} as const;

export interface KeyPackMetadata {
	id: string;
	name: string;
	description?: string;
}

export interface KeyPackContent {
	sm_sec: string;
	sm_pub: string;
	metadata?: KeyPackMetadata;
}

export interface EncryptionResult {
	success: boolean;
	event?: NostrEvent;
	error?: string;
}

export interface DecryptionResult {
	success: boolean;
	event?: NostrEvent;
	error?: string;
}

/**
 * Derives conversation key for symmetric encryption using the SM shared key.
 * According to NIP-44, conversation keys are derived from ECDH between two parties.
 * For symmetric encryption with a shared key, we use the shared key as both private and public components.
 * @param sm_sec The SM shared private key
 * @param sm_pub The SM shared public key (identifier)
 * @returns The conversation key for symmetric encryption
 * @throws {Error} If key derivation fails
 */
export function deriveSMConversationKey(sm_sec: string, sm_pub: string): Uint8Array {
	try {
		// For symmetric encryption with a shared key, we derive the conversation key
		// using the shared key as both the private and public components
		// This follows NIP-44's conversation key derivation but adapted for symmetric use
		return nip44.v2.utils.getConversationKey(hexToBytes(sm_sec), sm_pub);
	} catch (error) {
		throw new Error(
			`Failed to derive conversation key: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

/**
 * Encrypts a state machine event using the SM shared key and wraps it in a kind 1059 event.
 * @param innerEvent The state machine event to encrypt
 * @param sm_sec The SM shared private key
 * @param sm_pub The SM shared public key (identifier)
 * @returns The encrypted gift wrap event
 */
export function encryptStateMachineEvent(
	innerEvent: NostrEvent,
	sm_sec: string,
	sm_pub: string
): EncryptionResult {
	try {
		const ephemeralKey = generateSecretKey();
		const ephemeralPublicKey = getPublicKey(ephemeralKey);

		// Derive conversation key for symmetric encryption with SM shared key
		const conversationKey = deriveSMConversationKey(sm_sec, sm_pub);

		const serializedEvent = JSON.stringify(innerEvent);
		const encryptedContent = nip44.v2.encrypt(serializedEvent, conversationKey);

		const giftWrap = {
			kind: GIFT_WRAP_KIND,
			content: encryptedContent,
			tags: [[NOSTR_TAGS.PUBKEY, sm_pub]],
			created_at: Math.floor(Date.now() / 1000),
			pubkey: ephemeralPublicKey
		};

		const encryptedEvent = finalizeEvent(giftWrap, ephemeralKey);
		return { success: true, event: encryptedEvent };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown encryption error';
		console.error('Error encrypting state machine event:', error);
		return { success: false, error: errorMessage };
	}
}

/**
 * Decrypts a gift-wrapped state machine event using the SM shared key.
 * @param wrapperEvent The gift wrap event (kind 1059)
 * @param sm_sec The SM shared private key
 * @param sm_pub The SM shared public key (identifier)
 * @returns The decrypted inner event
 * @throws If decryption fails or the event is not a valid gift wrap
 */
export function decryptStateMachineEvent(
	wrapperEvent: NostrEvent,
	sm_sec: string,
	sm_pub: string
): DecryptionResult {
	if (wrapperEvent.kind !== GIFT_WRAP_KIND) {
		return { success: false, error: 'Event is not a gift wrap' };
	}

	try {
		// Derive conversation key for symmetric encryption with SM shared key
		const conversationKey = deriveSMConversationKey(sm_sec, sm_pub);

		const decryptedContent = nip44.v2.decrypt(wrapperEvent.content, conversationKey);
		const innerEvent = JSON.parse(decryptedContent);

		// Validate that the parsed content is a valid NostrEvent
		if (!innerEvent || typeof innerEvent !== 'object' || !innerEvent.kind) {
			return { success: false, error: 'Decrypted content is not a valid Nostr event' };
		}

		return { success: true, event: innerEvent };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown decryption error';
		console.error('Error decrypting state machine event:', error);
		return { success: false, error: errorMessage };
	}
}

/**
 * Creates an SM Key Pack event (kind: 7502) for distributing SM shared keys
 * @param sm_sec The SM shared private key to distribute
 * @param sm_pub The SM shared public key (identifier)
 * @param participantPubkey The participant's public key to encrypt for
 * @param metadata Optional metadata for the key pack
 * @returns The encrypted key pack event
 */
export function createSMKeyPack(
	sm_sec: string,
	sm_pub: string,
	participantPubkey: string,
	metadata?: KeyPackMetadata
): NostrEvent {
	const ephemeralKey = generateSecretKey();
	const ephemeralPublicKey = getPublicKey(ephemeralKey);

	// Validate and decode participant public key to hex format
	const decodedParticipantPubkey = validateAndDecodePubkey(participantPubkey);
	if (!decodedParticipantPubkey) {
		throw new Error(`Invalid participant public key format: ${participantPubkey}`);
	}

	try {
		const conversationKey = nip44.v2.utils.getConversationKey(
			ephemeralKey,
			decodedParticipantPubkey
		);

		const keyPackContent = JSON.stringify({
			sm_sec,
			sm_pub,
			metadata
		});

		const encryptedContent = nip44.v2.encrypt(keyPackContent, conversationKey);

		const keyPackEvent = {
			kind: SM_KEY_PACK_KIND,
			content: encryptedContent,
			tags: [[NOSTR_TAGS.PUBKEY, decodedParticipantPubkey]],
			created_at: Math.floor(Date.now() / 1000),
			pubkey: ephemeralPublicKey
		};
		return finalizeEvent(keyPackEvent, ephemeralKey);
	} catch (error) {
		console.error('Error creating SM key pack:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		throw new Error(`Failed to create SM key pack: ${errorMessage}`);
	}
}

/**
 * Decrypts an SM Key Pack event to retrieve the SM shared key
 * @param keyPackEvent The kind:7502 key pack event
 * @param signer The user's signer for decryption
 * @returns The decrypted SM key and metadata
 */
export async function decryptSMKeyPack(
	keyPackEvent: NostrEvent,
	signer: ISigner
): Promise<{ sm_sec: string; sm_pub: string; metadata?: KeyPackMetadata }> {
	if (keyPackEvent.kind !== SM_KEY_PACK_KIND) {
		throw new Error('Event is not an SM key pack.');
	}

	if (signer.nip44?.decrypt) {
		const decryptedContent = await signer.nip44.decrypt(keyPackEvent.pubkey, keyPackEvent.content);
		return JSON.parse(decryptedContent);
	}

	throw new Error('Signer does not support NIP-44 decryption.');
}
