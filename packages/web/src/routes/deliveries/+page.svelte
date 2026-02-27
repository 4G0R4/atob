<script lang="ts">
	import { activeAccount } from '$lib/services/accountManager.svelte';
	import { eventStore } from '@/services/eventStore';
	import {
		createTimelineLoaderByFilter,
		userParticipatedDeliveriesFilter,
		deliveriesFilter
	} from '@/services/loaders.svelte';
	import DeliveryCard from '$lib/components/DeliveryCard.svelte';
	import DeliveriesMap from '$lib/components/DeliveriesMap.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { RefreshCw } from 'lucide-svelte';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { TimelineModel } from 'applesauce-core/models';

	// Get transition events where user participated
	const myTransitionEvents = $activeAccount?.pubkey
		? eventStore.model(TimelineModel, userParticipatedDeliveriesFilter($activeAccount.pubkey))
		: undefined;

	// Get all deliveries
	const allDeliveries = eventStore.model(TimelineModel, deliveriesFilter);

	let refresh = $state(0);
	let loading = $state(false);
	let hoveredCardId = $state<string | null>(null);

	// Extract unique delivery IDs from transition events
	const participatedDeliveryIds = $derived.by(() => {
		if (!$myTransitionEvents) return new Set<string>();
		const ids = new Set<string>();
		for (const event of $myTransitionEvents) {
			const eTag = event.tags.find((t) => t[0] === 'e');
			if (eTag?.[1]) ids.add(eTag[1]);
		}
		return ids;
	});

	// Filter all deliveries to only show ones user has participated in
	const myDeliveries = $derived.by(() => {
		if (!$allDeliveries || participatedDeliveryIds.size === 0) return [];
		return $allDeliveries.filter((delivery) => participatedDeliveryIds.has(delivery.id));
	});

	$effect(() => {
		if (!$activeAccount) return;
		refresh;

		const sub = createTimelineLoaderByFilter(
			userParticipatedDeliveriesFilter($activeAccount.pubkey)
		).subscribe();
		return () => {
			sub.unsubscribe();
		};
	});

	// Also load all deliveries so we can match them with transition events
	$effect(() => {
		refresh;
		const sub = createTimelineLoaderByFilter(deliveriesFilter).subscribe();
		return () => {
			sub.unsubscribe();
		};
	});

	function handleCardHover(deliveryId: string) {
		hoveredCardId = deliveryId;
	}

	function handleCardHoverLeave() {
		hoveredCardId = null;
	}
</script>

<div class="space-y-6">
	<div class="space-y-4">
		<h1 class="text-off-white text-4xl font-bold">My Deliveries</h1>
		<p class="text-adaptive-gray text-lg">
			View all deliveries you have accepted or participated in.
		</p>
	</div>

	{#if $activeAccount}
		{#if myDeliveries && myDeliveries.length > 0}
			<!-- Two Column Layout: List (Left) + Map (Right) -->
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2" style="height: calc(100vh - 280px);">
				<!-- Left: Scrollable Delivery List -->
				<div class="flex min-h-0 flex-col">
					<div class="mb-6 flex items-center justify-between">
						<h2 class="text-off-white text-2xl font-semibold">Active Deliveries</h2>
						<Button
							variant="outline"
							size="icon"
							class="border-purple-400/20 bg-black/20 text-purple-300 hover:border-purple-400/30 hover:bg-purple-400/10"
							onclick={() => {
								refresh++;
								loading = true;
								setTimeout(() => {
									loading = false;
								}, 1000);
							}}
							disabled={loading}
						>
							{#if loading}
								<Spinner class="h-4 w-4" />
							{:else}
								<RefreshCw class="h-4 w-4" />
							{/if}
						</Button>
					</div>
					<div class="flex-1 overflow-y-auto pr-2">
						<div class="space-y-4">
							{#each myDeliveries as delivery (delivery.id)}
								<DeliveryCard
									{delivery}
									onhover={handleCardHover}
									onhoverleave={handleCardHoverLeave}
								/>
							{/each}
						</div>
					</div>
				</div>

				<!-- Right: Map View (Desktop Only) -->
				<div class="card-cyberpunk hidden overflow-hidden lg:block">
					<DeliveriesMap deliveries={myDeliveries} externalHoveredId={hoveredCardId} />
				</div>
			</div>
		{:else}
			<div class="card-cyberpunk p-8">
				<p class="text-center text-gray-400">No accepted deliveries found.</p>
			</div>
		{/if}
	{:else}
		<div class="card-cyberpunk p-8">
			<p class="text-center text-gray-400">Please log in to see your deliveries.</p>
		</div>
	{/if}
</div>
