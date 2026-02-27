<script lang="ts">
	import Button, { buttonVariants } from './ui/button/button.svelte';
	import ProfileCard from './ProfileCard.svelte';
	import SingleDeliveryMap from './SingleDeliveryMap.svelte';
	import { ArrowLeft, ChevronsUpDownIcon } from 'lucide-svelte';
	import type { PublicOffer } from '$lib/models/public-offer';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	let { delivery }: { delivery: PublicOffer } = $props();

	// Helper to format unix seconds to local string
	function formatDeadline(ts?: number) {
		if (!ts) return null;
		try {
			return new Date(ts * 1000).toLocaleString();
		} catch {
			return null;
		}
	}
</script>

<div class="space-y-6">
	<!-- Back Button -->
	<div class="flex justify-start">
		<Button
			variant="outline"
			onclick={() => window.history.back()}
			class="border-purple-400/20 bg-black/20 text-purple-300 hover:border-purple-400/30 hover:bg-purple-400/10"
		>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back
		</Button>
	</div>

	<!-- Mobile Map at Top -->
	<div class="card-cyberpunk overflow-hidden lg:hidden" style="height: 50dvh;">
		<SingleDeliveryMap delivery={delivery.rawEvent} />
	</div>

	<!-- Two Column Layout: Details (Left) + Map (Right on Desktop) -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2" style="height: calc(100dvh - 200px);">
		<!-- Left: Details (Mobile: full page scroll, Desktop: scrollable) -->
		<div class="flex min-h-0 flex-col">
			<div class="space-y-6 pb-20 lg:flex-1 lg:overflow-y-auto lg:pr-2 lg:pb-0">
				<div class="card-cyberpunk space-y-4 p-6">
					<div>
						<h2 class="text-off-white mb-2 text-2xl font-bold">{delivery.title}</h2>
						<p class="text-adaptive-gray">{delivery.description}</p>
					</div>

					<!-- Metadata grid -->
					<div class="space-y-4">
						<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
							<div class="flex flex-col">
								<span class="font-semibold text-gray-400">Amount</span>
								<span class="text-off-white"
									>{delivery.amount ?? '—'} {delivery.currency || 'SATS'}</span
								>
							</div>
							<div class="flex flex-col">
								<span class="font-semibold text-gray-400">Pickup</span>
								<span class="text-off-white">{delivery.pickup_geohash || '—'}</span>
							</div>
							<div class="flex flex-col">
								<span class="font-semibold text-gray-400">Dropoff</span>
								<span class="text-off-white">{delivery.dropoff_geohash || '—'}</span>
							</div>
						</div>

						<!-- Additional metadata: roles, comms, engines, deadline -->
						<div class="grid grid-cols-1 gap-3">
							{#if delivery.roles && delivery.roles.length}
								<div>
									<span class="font-semibold text-gray-400">Roles</span>
									<div class="mt-2 flex flex-wrap gap-2">
										{#each delivery.roles as r (r)}
											<span class="text-off-white rounded bg-purple-700/20 px-2 py-1 text-sm"
												>{r}</span
											>
										{/each}
									</div>
								</div>
							{/if}

							{#if delivery.comms && delivery.comms.length}
								<div>
									<span class="font-semibold text-gray-400">Communication Channels</span>
									<div class="mt-2 space-y-2">
										{#each delivery.comms as c, i (i)}
											<div
												class="flex items-center justify-between rounded border border-purple-400/10 px-3 py-2"
											>
												<div>
													<div class="text-sm">
														<span class="font-semibold">{c[1]}</span>
														{#if c.length > 2}
															<span class="ml-2 text-gray-300">{c.slice(2).join(', ')}</span>
														{/if}
													</div>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							{#if delivery.engines && delivery.engines.length}
								<div>
									<span class="font-semibold text-gray-400">Engines</span>
									<ul class="text-off-white mt-2 list-disc pl-5">
										{#each delivery.engines as e (e.name)}
											<li>
												<strong>{e.name}</strong>
												{#if e.params && e.params.length}
													<span class="text-gray-400"> — {e.params.join(', ')}</span>
												{/if}
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							{#if delivery.deadline}
								<div>
									<span class="font-semibold text-gray-400">Deadline</span>
									<div class="text-off-white mt-1">
										{formatDeadline(delivery.deadline) || delivery.deadline}
									</div>
								</div>
							{/if}
						</div>

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<ProfileCard pubkey={delivery.creator} role="Creator" />
						</div>
					</div>

					{#if delivery.content || delivery.contentPreview}
						<Collapsible.Root class="space-y-2">
							<div class="flex items-center justify-between">
								<Collapsible.Trigger class={buttonVariants({ variant: 'ghost' })}>
									<ChevronsUpDownIcon />
									<span class="font-semibold text-gray-400">State Machine Preview</span>
								</Collapsible.Trigger>
							</div>
							<Collapsible.Content class="space-y-2">
								{#if delivery.contentPreview}
									<pre
										class="text-off-white mt-2 max-h-64 overflow-auto text-xs whitespace-pre-wrap">{JSON.stringify(
											delivery.contentPreview,
											null,
											2
										)}</pre>
								{:else}
									<pre
										class="text-off-white mt-2 max-h-64 overflow-auto text-xs whitespace-pre-wrap">{delivery.content}</pre>
								{/if}
							</Collapsible.Content>
						</Collapsible.Root>
					{/if}
				</div>
			</div>
		</div>

		<!-- Right: Map View (Desktop Only) -->
		<div class="card-cyberpunk hidden overflow-hidden lg:block">
			<SingleDeliveryMap delivery={delivery.rawEvent} />
		</div>
	</div>
</div>
