<script lang="ts">
	import { relayPool } from '$lib/services/relay-pool';
	import { validateAndDecodePubkey, encodeNpub, NostrIdentifierTypeGuard } from '$lib/utils.nostr';
	import { Metadata } from 'nostr-tools/kinds';
	import ProfileCard from '$lib/components/ProfileCard.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import type { NostrEvent } from 'nostr-tools';

	let {
		placeholder = 'Search profiles or paste npub...',
		onSelect,
		value = $bindable()
	}: {
		placeholder?: string;
		onSelect?: (npub: string) => void;
		value?: string;
	} = $props();

	let searchQuery = $state('');
	let showSearchResults = $state(false);
	let isLoading = $state(false);
	let searchResults = $state<string[]>([]);
	let relaySubscription: any = null;
	let lastSearchedQuery = $state('');
	const DEBOUNCE_MS = 300;

	// Search relays for profile metadata
	const searchRelays = ['wss://relay.nostr.band', 'wss://search.nos.today', 'wss://nos.lol'];

	function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
		let timeoutId: number | undefined;
		return function (this: any, ...args: Parameters<T>) {
			clearTimeout(timeoutId);
			timeoutId = window.setTimeout(() => fn.apply(this, args), delay);
		} as T;
	}

	const performSearch = debounce(() => {
		const query = searchQuery.trim();

		// Skip search if trimmed query hasn't changed
		if (query === lastSearchedQuery) {
			return;
		}

		lastSearchedQuery = query;

		if (!query) {
			searchResults = [];
			isLoading = false;
			return;
		}

		try {
			isLoading = true;
			searchResults = [];

			// If it's a valid pubkey identifier, add it to results immediately
			if (NostrIdentifierTypeGuard.isValidPubkeyIdentifier(query)) {
				const hexPubkey = validateAndDecodePubkey(query);
				if (hexPubkey) {
					searchResults = [hexPubkey];
					isLoading = false;
					return;
				}
			}

			// Clean up previous subscription
			if (relaySubscription) {
				relaySubscription.unsubscribe();
				relaySubscription = null;
			}

			// Search for profiles by name using relay subscription
			const filter = {
				kinds: [Metadata],
				search: query,
				limit: 20
			};

			// Use direct relay subscription for faster results
			relaySubscription = relayPool
				.subscription(searchRelays, filter, {
					id: `profile-search-${Date.now()}`,
					retries: 0
				})
				.subscribe({
					next: (event) => {
						// Handle EOSE (End of Stored Events)
						if (event === 'EOSE') {
							isLoading = false;
							return;
						}

						// Add pubkey to results if not already present
						const nostrEvent = event as NostrEvent;
						if (nostrEvent?.pubkey && !searchResults.includes(nostrEvent.pubkey)) {
							searchResults = [...searchResults, nostrEvent.pubkey];
						}
					},
					error: (err) => {
						console.error('Subscription error:', err);
						isLoading = false;
					}
				});

			// Clean up subscription after timeout
			setTimeout(() => {
				if (relaySubscription) {
					relaySubscription.unsubscribe();
					relaySubscription = null;
				}
				isLoading = false;
			}, 5000);
		} catch (error) {
			console.error('Search error:', error);
			isLoading = false;
			searchResults = [];
		}
	}, DEBOUNCE_MS);

	function handleSelect(pubkey: string) {
		const npub = encodeNpub(pubkey);

		// Update bound value and input
		value = npub;
		searchQuery = npub;
		lastSearchedQuery = npub; // Update cache to prevent re-search

		// Call onSelect callback if provided
		onSelect?.(npub);

		// Hide results
		showSearchResults = false;
		searchResults = [];

		// Clean up subscription
		if (relaySubscription) {
			relaySubscription.unsubscribe();
			relaySubscription = null;
		}
	}

	// Sync searchQuery changes to value and trigger search
	$effect(() => {
		value = searchQuery;
		const trimmedQuery = searchQuery.trim();

		if (trimmedQuery) {
			performSearch();
		} else {
			// Clear results when input is empty or whitespace-only
			searchResults = [];
			lastSearchedQuery = '';
		}
	});

	// Cleanup on unmount
	$effect(() => {
		return () => {
			if (relaySubscription) {
				relaySubscription.unsubscribe();
				relaySubscription = null;
			}
		};
	});
</script>

<div class="relative">
	<Input
		type="search"
		{placeholder}
		bind:value={searchQuery}
		onfocus={() => (showSearchResults = true)}
		onblur={() => setTimeout(() => (showSearchResults = false), 150)}
	/>
	{#if showSearchResults && (searchResults.length > 0 || isLoading)}
		<div
			role="listbox"
			tabindex="-1"
			class="dark:text-off-white absolute bottom-full z-10 mb-1 w-full rounded-md border border-purple-400/20 bg-white/90 text-gray-900 shadow-lg backdrop-blur-lg dark:bg-black/90"
			onmousedown={(e) => e.preventDefault()}
		>
			<div class="max-h-60 overflow-y-auto p-1">
				{#if isLoading}
					<div class="flex items-center gap-2 p-2 text-sm text-gray-700 dark:text-gray-300">
						<Spinner class="size-4" />
						Searching...
					</div>
				{:else if searchResults.length === 0}
					<div class="p-2 text-sm text-gray-700 dark:text-gray-300">No profiles found.</div>
				{:else}
					{#each searchResults as pubkey (pubkey)}
						<button
							type="button"
							class="dark:text-off-white w-full rounded-md p-2 text-left text-sm text-gray-900 transition-colors hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-300"
							onclick={() => handleSelect(pubkey)}
						>
							<ProfileCard {pubkey} />
						</button>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>
