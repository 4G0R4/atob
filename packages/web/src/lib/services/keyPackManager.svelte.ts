import { relayPool } from './relay-pool';
import { relayStore } from '$lib/stores/relay-store.svelte';
import {
	createSMKeyPack,
	decryptSMKeyPack,
	SM_KEY_PACK_KIND,
	type KeyPackMetadata
} from '$lib/utils/encryption';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { publishEvent } from '$lib/utils.nostr';
import type { Filter } from 'nostr-tools';
import { activeAccount } from './accountManager.svelte';
import { lastValueFrom, toArray } from 'rxjs';
import { bytesToHex } from 'nostr-tools/utils';

export interface SMKeyStore {
	[sm_pub: string]: {
		sm_sec: string;
		metadata?: KeyPackMetadata;
	};
}

class KeyPackManager {
	private keyStore = $state<SMKeyStore>({});

	/**
	 * Discover key packs for current user (legacy method - use subscription manager instead)
	 * @deprecated Use subscriptionManager.initializeSubscriptions() for real-time key pack discovery
	 */
	async discoverKeyPacks(): Promise<void> {
		console.warn(
			'discoverKeyPacks() is deprecated. Use subscriptionManager.initializeSubscriptions() instead.'
		);
		// This method is kept for backward compatibility but should not be used
		// The subscription manager handles real-time key pack discovery more efficiently
	}

	/**
	 * Store a new SM key
	 */
	storeKey(sm_pub: string, sm_sec: string, metadata?: KeyPackMetadata): void {
		this.keyStore = {
			...this.keyStore,
			[sm_pub]: { sm_sec, metadata }
		};
	}

	/**
	 * Get SM key for a given sm_pub
	 */
	getKey(sm_pub: string): string | undefined {
		return this.keyStore[sm_pub]?.sm_sec;
	}

	/**
	 * Check if user has access to an encrypted delivery
	 */
	hasAccess(sm_pub: string): boolean {
		return this.getKey(sm_pub) !== undefined;
	}

	/**
	 * Get all accessible SM public keys
	 */
	// TODO: Maybe this can use a $derived rune to react to changes in the key store
	getAccessibleSMPubkeys(): string[] {
		return Object.keys(this.keyStore);
	}

	/**
	 * Create and distribute key packs for new encrypted delivery
	 */
	async createKeyPack(
		participants: string[],
		metadata: Omit<KeyPackMetadata, 'id' | 'created_at'>,
		creatorPubkey?: string
	): Promise<{ sm_pub: string; sm_sec: string }> {
		// Generate SM shared key pair
		const sm_sec = generateSecretKey();
		const sm_pub = getPublicKey(sm_sec);
		const sm_sec_hex = bytesToHex(sm_sec);
		// Create metadata with ID and timestamp
		const fullMetadata: KeyPackMetadata = {
			...metadata,
			id: `${sm_pub}-${Date.now()}`
		};
		// Include creator as a participant if not already included
		const allParticipants = [...new Set([...participants])];
		if (creatorPubkey && !allParticipants.includes(creatorPubkey)) {
			allParticipants.push(creatorPubkey);
		}

		// Create and publish key packs for each participant
		for (const participant of allParticipants) {
			const keyPackEvent = createSMKeyPack(sm_sec_hex, sm_pub, participant, fullMetadata);
			await publishEvent(keyPackEvent);
		}
		// Store the key locally for the creator
		this.storeKey(sm_pub, sm_sec_hex, fullMetadata);
		return { sm_pub, sm_sec: sm_sec_hex };
	}

	/**
	 * Add participant to existing encrypted delivery
	 */
	async addParticipant(sm_pub: string, newParticipant: string): Promise<void> {
		const smKey = this.keyStore[sm_pub];
		if (!smKey) {
			throw new Error('SM key not found for the given sm_pub');
		}

		const keyPackEvent = createSMKeyPack(smKey.sm_sec, sm_pub, newParticipant, smKey.metadata);
		await publishEvent(keyPackEvent);
	}

	/**
	 * Clear all stored keys (useful for logout)
	 */
	clearKeys(): void {
		this.keyStore = {};
	}
}

// Create and export singleton instance
export const keyPackManager = new KeyPackManager();
