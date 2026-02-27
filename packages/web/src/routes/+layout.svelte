<script lang="ts">
	import Header from '@/components/Header.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import '../app.css';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { page } from '$app/state';
	import { subscriptionManager } from '$lib/services/subs.svelte';
	import { activeAccount } from '$lib/services/accountManager.svelte';

	let { children } = $props();

	// Allow homepage to be full-width without constraints
	const isHomepage = $derived(page.url.pathname === '/');

	// Initialize subscriptions when user logs in
	$effect(() => {
		const isInitialized = subscriptionManager.isSubscriptionsInitialized;

		if ($activeAccount?.pubkey && !isInitialized) {
			console.log('User logged in, initializing subscriptions');
			subscriptionManager.initializeSubscriptions();
		} else if (!$activeAccount?.pubkey && isInitialized) {
			console.log('User logged out, cleaning up subscriptions');
			subscriptionManager.cleanupSubscriptions();
		}

		return () => {
			if (subscriptionManager.isSubscriptionsInitialized) {
				console.log('Layout unmounting, cleaning up subscriptions');
				subscriptionManager.cleanupSubscriptions();
			}
		};
	});
</script>

<ModeWatcher track={true} defaultMode="dark" />
<Header />
<Toaster richColors />
{#if isHomepage}
	{@render children()}
{:else}
	<!-- Background for non-homepage pages -->
	<div class="fixed inset-0 -z-10">
		<!-- Dark mode image -->
		<img
			src="/hero-3.jpeg"
			alt="Background"
			class="absolute inset-0 hidden h-full w-full object-cover object-center dark:block"
			style="filter: brightness(0.3);"
		/>
		<!-- Light mode image -->
		<img
			src="/hero-3-light.jpg"
			alt="Background"
			class="absolute inset-0 block h-full w-full object-cover object-center dark:hidden"
			style="filter: brightness(0.7);"
		/>
		<div class="absolute inset-0 bg-white/20 dark:bg-black/40"></div>
		<div class="absolute inset-0 bg-white/20 dark:bg-black/40"></div>
	</div>

	<div class="relative z-10 container mx-auto px-4 pt-20 pb-8">
		{@render children()}
	</div>
{/if}
