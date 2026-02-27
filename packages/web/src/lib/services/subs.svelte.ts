import { relayPool } from './relay-pool';
import { relayStore } from '$lib/stores/relay-store.svelte';
import { keyPackManager } from './keyPackManager.svelte';
import { encryptedEventStore } from './encryptedEventStore';
import { activeAccount } from './accountManager.svelte';
import { SM_KEY_PACK_KIND, GIFT_WRAP_KIND, decryptSMKeyPack } from '$lib/utils/encryption';
import type { Filter } from 'nostr-tools';
import type { Subscription } from 'rxjs';

class SubscriptionManager {
	private keyPackSubscription: Subscription | null = null;
	private encryptedEventsSubscription: Subscription | null = null;
	private isInitialized = $state(false);

	/**
	 * Initialize all subscriptions for the logged-in user
	 */
	async initializeSubscriptions(): Promise<void> {
		const account = activeAccount.value;
		if (!account) {
			console.log('No active account, skipping subscription initialization');
			return;
		}

		if (this.isInitialized) {
			console.log('Subscriptions already initialized');
			return;
		}

		console.log('Initializing real-time subscriptions for encrypted state machines');

		// Initialize key pack subscription for real-time key pack discovery
		await this.initializeKeyPackSubscription();

		// Initialize encrypted events subscription for real-time event processing
		await this.initializeEncryptedEventsSubscription();

		this.isInitialized = true;
	}

	/**
	 * Check if subscriptions are initialized
	 */
	get isSubscriptionsInitialized(): boolean {
		return this.isInitialized;
	}

	/**
	 * Initialize subscription for receiving new key packs
	 */
	private async initializeKeyPackSubscription(): Promise<void> {
		const account = activeAccount.value;
		if (!account) return;

		const filter: Filter = {
			kinds: [SM_KEY_PACK_KIND],
			'#p': [account.pubkey]
		};

		console.log('Setting up key pack subscription for user:', account.pubkey);

		this.keyPackSubscription = relayPool
			.subscription(relayStore.selectedRelays, filter, {
				retries: Infinity // retry forever
			})
			.subscribe({
				next: async (response) => {
					if (response === 'EOSE') {
						console.log('End of stored key pack events');
					} else if (response && typeof response === 'object') {
						console.log('New key pack received:', response.id);
						try {
							const decrypted = await decryptSMKeyPack(response, account.signer);
							keyPackManager.storeKey(decrypted.sm_pub, decrypted.sm_sec, decrypted.metadata);
							console.log('Key pack processed and stored for sm_pub:', decrypted.sm_pub);

							// Since we have a new key, we should update the encrypted events subscription
							await this.updateEncryptedEventsSubscription();
						} catch (error) {
							console.warn('Failed to decrypt key pack:', error);
						}
					}
				},
				error: (error) => {
					console.error('Key pack subscription error:', error);
				}
			});
	}

	/**
	 * Initialize subscription for receiving encrypted events
	 */
	private async initializeEncryptedEventsSubscription(): Promise<void> {
		const accessiblePubkeys = keyPackManager.getAccessibleSMPubkeys();
		if (accessiblePubkeys.length === 0) {
			console.log('No accessible SM public keys, skipping encrypted events subscription');
			return;
		}

		const filter: Filter = {
			kinds: [GIFT_WRAP_KIND],
			'#p': accessiblePubkeys
		};

		console.log('Setting up encrypted events subscription for SM pubkeys:', accessiblePubkeys);

		this.encryptedEventsSubscription = relayPool
			.subscription(relayStore.selectedRelays, filter, {
				retries: Infinity // retry forever
			})
			.subscribe({
				next: async (response) => {
					if (response === 'EOSE') {
						console.log('End of stored encrypted events');
					} else if (response && typeof response === 'object') {
						console.log('New encrypted event received:', response.id);
						try {
							await encryptedEventStore.processEncryptedEvent(response);
						} catch (error) {
							console.warn('Failed to process encrypted event:', error);
						}
					}
				},
				error: (error) => {
					console.error('Encrypted events subscription error:', error);
				}
			});
	}

	/**
	 * Update encrypted events subscription when accessible pubkeys change
	 */
	private async updateEncryptedEventsSubscription(): Promise<void> {
		// Close existing subscription
		if (this.encryptedEventsSubscription) {
			this.encryptedEventsSubscription.unsubscribe();
			this.encryptedEventsSubscription = null;
		}

		// Re-initialize with updated pubkeys
		await this.initializeEncryptedEventsSubscription();
	}

	/**
	 * Clean up all subscriptions
	 */
	cleanupSubscriptions(): void {
		console.log('Cleaning up all subscriptions');

		if (this.keyPackSubscription) {
			this.keyPackSubscription.unsubscribe();
			this.keyPackSubscription = null;
		}

		if (this.encryptedEventsSubscription) {
			this.encryptedEventsSubscription.unsubscribe();
			this.encryptedEventsSubscription = null;
		}

		this.isInitialized = false;
	}

	/**
	 * Get subscription status
	 */
	getStatus() {
		return {
			isInitialized: this.isInitialized,
			hasKeyPackSubscription: !!this.keyPackSubscription,
			hasEncryptedEventsSubscription: !!this.encryptedEventsSubscription
		};
	}
}

// Create and export singleton instance
export const subscriptionManager = new SubscriptionManager();
