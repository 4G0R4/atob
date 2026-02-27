<script lang="ts">
	import { eventStore } from '$lib/services/eventStore';
	import { TimelineModel } from 'applesauce-core/models';
	import {
		createTimelineLoaderByFilter,
		publicDeliveriesFilter
	} from '$lib/services/loaders.svelte';
	import DeliveryCard from '$lib/components/DeliveryCard.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { RefreshCw, List, Map } from 'lucide-svelte';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import DeliveriesMap from '@/components/DeliveriesMap.svelte';

	// TODO: Mobile view can be improved by using #if block as currently it is mounted and code is executed even if the view is not visible. This makes run the DeliveryCard component twice

	const deliveries = eventStore.model(TimelineModel, publicDeliveriesFilter);
	let refresh = $state(0);
	let loading = $state(false);
	let hoveredCardId = $state<string | null>(null);
	let activeTab = $state<'list' | 'map'>('list');

	$effect(() => {
		refresh;
		const sub = createTimelineLoaderByFilter(publicDeliveriesFilter).subscribe();
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
	<!-- Header Section -->
	<div class="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="space-y-4">
			<h1 class="text-off-white text-4xl font-bold">Public Deliveries</h1>
			<p class="text-adaptive-gray text-lg">
				Browse all available delivery requests on the network.
			</p>
		</div>
		<Button
			href="/deliveries/create"
			class="w-full border border-cyan-400/30 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 hover:text-cyan-200 sm:w-auto"
		>
			Create Delivery
		</Button>
	</div>

	<!-- Desktop: Two Column Layout: List (Left) + Map (Right) -->
	<div class="hidden grid-cols-2 gap-6 lg:grid" style="height: calc(100vh - 280px);">
		<!-- Left: Scrollable Delivery List -->
		<div class="flex min-h-0 flex-col">
			<div class="flex-1 space-y-6 overflow-y-auto pr-2">
				<div class="mb-6 flex items-center justify-between">
					<h2 class="text-off-white text-2xl font-semibold">Available Deliveries</h2>
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
				{#if $deliveries.length > 0}
					<div class="space-y-4">
						{#each $deliveries as delivery (delivery.id)}
							<DeliveryCard
								{delivery}
								onhover={handleCardHover}
								onhoverleave={handleCardHoverLeave}
							/>
						{/each}
					</div>
				{:else}
					<div class="card-cyberpunk p-8">
						<p class="text-center text-gray-400">No public deliveries found.</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Right: Map View -->
		<div class="card-cyberpunk overflow-hidden">
			<DeliveriesMap deliveries={$deliveries} externalHoveredId={hoveredCardId} />
		</div>
	</div>

	<!-- Mobile: Tabbed View -->
	<div class="lg:hidden">
		<!-- Tab Content -->
		<div class="mb-4" style="height: calc(100dvh - 200px);">
			{#if activeTab === 'list'}
				<!-- List View -->
				<div class="space-y-6 pb-20">
					<div class="flex items-center justify-between">
						<h2 class="text-off-white text-2xl font-semibold">Available Deliveries</h2>
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
					<div>
						{#if $deliveries.length > 0}
							<div class="space-y-4">
								{#each $deliveries as delivery (delivery.id)}
									<DeliveryCard
										{delivery}
										onhover={handleCardHover}
										onhoverleave={handleCardHoverLeave}
									/>
								{/each}
							</div>
						{:else}
							<div class="card-cyberpunk p-8">
								<p class="text-center text-gray-400">No public deliveries found.</p>
							</div>
						{/if}
					</div>
				</div>
			{:else}
				<!-- Map View -->
				<div class="card-cyberpunk overflow-hidden" style="height: calc(100dvh - 344px);">
					<DeliveriesMap deliveries={$deliveries} externalHoveredId={hoveredCardId} />
				</div>
			{/if}
		</div>

		<!-- Tab Navigation -->
		<div
			class="fixed right-0 bottom-0 left-0 z-50 border-t border-purple-400/20 bg-black/80 backdrop-blur-lg"
		>
			<div class="flex">
				<button
					class="flex flex-1 items-center justify-center gap-2 px-4 py-4 transition-colors {activeTab ===
					'list'
						? 'border-t-2 border-purple-400 bg-purple-500/20 text-purple-300'
						: 'text-gray-400 hover:text-gray-300'}"
					onclick={() => (activeTab = 'list')}
				>
					<List class="h-5 w-5" />
					<span class="font-medium">List</span>
				</button>
				<button
					class="flex flex-1 items-center justify-center gap-2 px-4 py-4 transition-colors {activeTab ===
					'map'
						? 'border-t-2 border-purple-400 bg-purple-500/20 text-purple-300'
						: 'text-gray-400 hover:text-gray-300'}"
					onclick={() => (activeTab = 'map')}
				>
					<Map class="h-5 w-5" />
					<span class="font-medium">Map</span>
				</button>
			</div>
		</div>
	</div>
</div>
