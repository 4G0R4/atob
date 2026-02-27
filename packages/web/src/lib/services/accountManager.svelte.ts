import { AccountManager } from 'applesauce-accounts';
import { registerCommonAccountTypes } from 'applesauce-accounts/accounts';
import { NostrConnectSigner } from 'applesauce-signers/signers';
import { browser } from '$app/environment';
import { relayPool } from './relay-pool';
import { keyPackManager } from './keyPackManager.svelte';
import { startEncryptedEventsProcessing } from './loaders.svelte';

// create an account manager instance
export const manager = new AccountManager();

export const activeAccount = manager.active$;
// register common account types
registerCommonAccountTypes(manager);

// Setup Nostr connect signer
NostrConnectSigner.subscriptionMethod = relayPool.subscription.bind(relayPool);
NostrConnectSigner.publishMethod = relayPool.publish.bind(relayPool);

// Client-side initialization
if (browser) {
	// first load all accounts from localStorage
	const json = JSON.parse(localStorage.getItem('atob-accounts') || '[]');
	if (json.length) {
		manager.fromJSON(json);

		// load active account from storage
		const active = localStorage.getItem('atob-active');
		if (active) {
			// Ensure the active id actually exists in the manager before calling setActive
			const accounts = manager.toJSON();
			const exists = accounts.find((a) => a.id === active);
			if (exists) {
				try {
					manager.setActive(active);
				} catch (err) {
					console.warn('Failed to set active account:', err);
					localStorage.removeItem('atob-active');
				}
			} else {
				console.warn('Active account id not found, removing from storage:', active);
				localStorage.removeItem('atob-active');
			}
		}

		// subscribe to active changes
	}
	manager.active$.subscribe(async (account) => {
		if (account) {
			localStorage.setItem('atob-active', account.id);
		} else {
			localStorage.removeItem('atob-active');
			// Clear keys on logout
			keyPackManager.clearKeys();
		}
	});
	// next, subscribe to any accounts added or removed
	manager.accounts$.subscribe(() => {
		// save all the accounts into the "accounts" field
		localStorage.setItem('atob-accounts', JSON.stringify(manager.toJSON()));
	});
}

export const logout = () => {
	// if (browser) {
	// 	localStorage.removeItem('atob-accounts');
	// }
	manager.clearActive();
};
