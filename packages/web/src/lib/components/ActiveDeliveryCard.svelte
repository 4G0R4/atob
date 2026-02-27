<script lang="ts">
	import { eventStore } from '@/services/eventStore';
	import { getTagValue } from 'applesauce-core/helpers';
	import type { Event } from 'nostr-tools';
	import { DeliveryModel } from '$lib/models/delivery';
	import { eventLoader } from '$lib/services/loaders.svelte';
	import { relayStore } from '@/stores/relay-store.svelte';
	import { formatUnixTimestamp } from '$lib/utils';
	import { Spinner } from '$lib/components/ui/spinner/index.js';

	let { delivery }: { delivery: Event } = $props();

	const deliveryId = getTagValue(delivery, 'e');
	let deliveryModel = $state(deliveryId ? eventStore.model(DeliveryModel, deliveryId) : undefined);

	$effect(() => {
		if (!deliveryId) return;
		const sub = eventLoader({
			id: deliveryId,
			relays: relayStore.selectedRelays
		}).subscribe();
		return () => {
			sub.unsubscribe();
		};
	});

	const date = $derived(
		$deliveryModel ? formatUnixTimestamp($deliveryModel.rawEvent.created_at, true) : ''
	);
</script>

{#if $deliveryModel}
	<a
		href={`/deliveries/${deliveryId}`}
		class="group card-cyberpunk block h-full overflow-hidden transition-all hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/20"
	>
		<div class="p-6">
			<div class="mb-2 flex items-center text-sm text-gray-400">
				<time datetime={date}>{date}</time>
			</div>
			<h3
				class="text-off-white mb-4 text-xl font-semibold tracking-tight transition-colors group-hover:text-purple-400"
			>
				{$deliveryModel.title}
			</h3>
			<div class="space-y-2 text-gray-300">
				<p class="text-sm">Amount: {$deliveryModel.amount} {$deliveryModel.currency || 'SATS'}</p>
				<p class="text-sm">Pickup: {$deliveryModel.pickup_geohash}</p>
				<p class="text-sm">Dropoff: {$deliveryModel.dropoff_geohash}</p>
			</div>
			<div class="mt-4 flex items-center text-sm font-medium text-purple-400">
				View Details
				<span class="ml-1 transition-transform group-hover:translate-x-1">→</span>
			</div>
		</div>
	</a>
{:else}
	<div class="card-cyberpunk p-6">
		<div class="flex items-center gap-2">
			<Spinner class="size-4" />
			<h3 class="text-off-white text-lg font-semibold">Loading delivery...</h3>
		</div>
	</div>
{/if}
