<script lang="ts">
	import { activeAccount } from '$lib/services/accountManager.svelte';
	import { eventStore } from '@/services/eventStore';
	import {
		createTimelineLoaderByFilter,
		userCreatedDeliveriesFilter
	} from '@/services/loaders.svelte';
	import DeliveryCard from '$lib/components/DeliveryCard.svelte';
	import DeliveriesMap from '$lib/components/DeliveriesMap.svelte';
	import { TimelineModel } from 'applesauce-core/models';
	import { RefreshCw, List, Map } from 'lucide-svelte';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import Button from '@/components/ui/button/button.svelte';

	const myPackages = $activeAccount?.pubkey
		? eventStore.model(TimelineModel, userCreatedDeliveriesFilter($activeAccount.pubkey))
		: undefined;

	let refresh = $state(0);
	let loading = $state(false);
	let hoveredCardId = $state<string | null>(null);
	let activeTab = $state<'list' | 'map'>('list');

	$effect(() => {
		if (!$activeAccount) return;
		refresh;

		const sub = createTimelineLoaderByFilter(
			userCreatedDeliveriesFilter($activeAccount.pubkey)
		).subscribe();
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
		<h1 class="text-off-white text-4xl font-bold">My Packages</h1>
		<p class="text-adaptive-gray text-lg">View all delivery requests you have created.</p>
	</div>

	{#if $activeAccount}
		{#if $myPackages && $myPackages.length > 0}
			<!-- Desktop: Two Column Layout: List (Left) + Map (Right) -->
			<div class="hidden grid-cols-2 gap-6 lg:grid" style="height: calc(100vh - 280px);">
				<!-- Left: Scrollable Package List -->
				<div class="flex min-h-0 flex-col">
					<div class="flex-1 space-y-6 overflow-y-auto pr-2">
						<div class="mb-6 flex items-center justify-between">
							<h2 class="text-off-white text-2xl font-semibold">Your Packages</h2>
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
						<div class="space-y-4">
							{#each $myPackages as delivery (delivery.id)}
								<DeliveryCard
									{delivery}
									onhover={handleCardHover}
									onhoverleave={handleCardHoverLeave}
								/>
							{/each}
						</div>
					</div>
				</div>

				<!-- Right: Map View -->
				<div class="card-cyberpunk overflow-hidden">
					<DeliveriesMap deliveries={$myPackages} externalHoveredId={hoveredCardId} />
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
								<h2 class="text-off-white text-2xl font-semibold">Your Packages</h2>
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
								<div class="space-y-4">
									{#each $myPackages as delivery (delivery.id)}
										<DeliveryCard
											{delivery}
											onhover={handleCardHover}
											onhoverleave={handleCardHoverLeave}
										/>
									{/each}
								</div>
							</div>
						</div>
					{:else}
						<!-- Map View -->
						<div class="card-cyberpunk overflow-hidden" style="height: calc(100dvh - 300px);">
							<DeliveriesMap deliveries={$myPackages} externalHoveredId={hoveredCardId} />
						</div>
					{/if}
				</div>

				<!-- Tab Navigation -->
				<div
					class="fixed right-0 bottom-0 left-0 z-50 border-t border-purple-400/20 bg-black/80 backdrop-blur-lg"
				>
					<div class="flex">
						<Button
							class="flex flex-1 items-center justify-center gap-2 px-4 py-4 transition-colors {activeTab ===
							'list'
								? 'border-t-2 border-purple-400 bg-purple-500/20 text-purple-300'
								: 'text-gray-400 hover:text-gray-300'}"
							onclick={() => (activeTab = 'list')}
						>
							<List class="h-5 w-5" />
							<span class="font-medium">List</span>
						</Button>
						<Button
							class="flex flex-1 items-center justify-center gap-2 px-4 py-4 transition-colors {activeTab ===
							'map'
								? 'border-t-2 border-purple-400 bg-purple-500/20 text-purple-300'
								: 'text-gray-400 hover:text-gray-300'}"
							onclick={() => (activeTab = 'map')}
						>
							<Map class="h-5 w-5" />
							<span class="font-medium">Map</span>
						</Button>
					</div>
				</div>
			</div>
		{:else}
			<div class="card-cyberpunk p-8">
				<p class="text-center text-gray-400">You haven't created any delivery requests yet.</p>
			</div>
		{/if}
	{:else}
		<div class="card-cyberpunk p-8">
			<p class="text-center text-gray-400">Please log in to see your packages.</p>
		</div>
	{/if}
</div>
