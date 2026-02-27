<script lang="ts">
	import { relayStore } from '@/stores/relay-store.svelte';
	import { relayPool } from '$lib/services/relay-pool';
	import { transitionEventsFilter } from '$lib/services/loaders.svelte';
	import type { Event } from 'nostr-tools';
	import type { Delivery } from '$lib/models/delivery';
	import { activeAccount } from '$lib/services/accountManager.svelte';
	import Button from '@/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card';
	import { formatUnixTimestamp } from '@/utils';
	import ProfileCard from './ProfileCard.svelte';
	import Switch from './ui/switch/switch.svelte';
	import Label from './ui/label/label.svelte';
	import { eventStore } from '@/services/eventStore';
	import { tick } from 'svelte';

	let {
		delivery,
		onSend,
		deliveryState
	}: {
		delivery: Delivery;
		onSend: (event: Event) => void;
		deliveryState: Event | undefined;
	} = $props();

	let transitionEvents: Event[] = $state([]);
	let filteredTransitionEvents: Event[] = $state([]);
	let filterEvents = $state(false);

	$effect(() => {
		(async () => {
			if (!delivery) return;
			await tick();
			const evStoreSub = eventStore.filters(transitionEventsFilter(delivery.id)).subscribe({
				next: (event) => {
					console.log('Received events:', event, delivery.id);
					transitionEvents.push(event);
				}
			});

			return () => evStoreSub.unsubscribe();
		})();
	});
	$effect(() => {
		const sub = relayPool
			.subscription(relayStore.selectedRelays, transitionEventsFilter(delivery.id))
			.subscribe({
				next: (event) => {
					console.log('Received event:', event, delivery.id);
					if (event && event !== 'EOSE') {
						console.log('Adding event to store', event);
						eventStore.add(event);
					}
				}
			});

		return () => {
			sub.unsubscribe();
		};
	});

	$effect(() => {
		if (filterEvents && deliveryState) {
			try {
				const stateContext = JSON.parse(deliveryState.content).context;
				const contextPubKeys = Object.values(stateContext).filter(Boolean);
				filteredTransitionEvents = transitionEvents.filter((event) =>
					contextPubKeys.includes(event.pubkey)
				);
			} catch (e) {
				console.error('Failed to parse state snapshot content for filtering', e);
				filteredTransitionEvents = transitionEvents;
			}
		} else {
			filteredTransitionEvents = transitionEvents;
		}
	});

	function getTransitionType(event: Event): string {
		const typeTag = event.tags.find((tag) => tag[0] === 't');
		return typeTag ? typeTag[1] : 'Unknown';
	}

	function getParticipantRole(pubkey: string): string | undefined {
		if (!deliveryState) return undefined;
		try {
			const context = JSON.parse(deliveryState.content).context;
			if (context.creatorPubKey === pubkey) return 'Creator';
			if (context.executorPubKey === pubkey) return 'Executor';
			if (context.receiverPubKey === pubkey) return 'Receiver';
			if (context.inputterPubKey === pubkey) return 'Inputter';
		} catch (e) {
			console.error('Failed to parse state for role', e);
		}
		return undefined;
	}
</script>

{#if transitionEvents.length}
	<div class="space-y-4">
		<h3 class="text-off-white text-xl font-semibold">Transition Events</h3>
		<div class="flex items-center space-x-2">
			<Switch id="filter-events" bind:checked={filterEvents} />
			<Label for="filter-events" class="text-gray-300">Show only events from context pubkeys</Label>
		</div>
		{#if filteredTransitionEvents.length > 0}
			<div class="space-y-3">
				{#each filteredTransitionEvents as event (event.id)}
					{@const role = getParticipantRole(event.pubkey)}
					<div class="card-cyberpunk p-4">
						<div class="flex items-center justify-between gap-4">
							<div class="flex flex-col gap-2">
								<div class="flex items-center gap-2">
									<div class="flex flex-col gap-2">
										<span class="text-off-white font-semibold">{getTransitionType(event)}</span>
										<div>
											<span class="block font-mono text-xs break-all"
												><ProfileCard pubkey={event.pubkey} {role} /></span
											>
										</div>
									</div>
								</div>
								<span class="font-mono text-xs text-gray-400"
									>{formatUnixTimestamp(event.created_at, true)}</span
								>
							</div>
							<div class="flex items-center gap-2">
								{#if $activeAccount}
									<Button size="sm" onclick={() => onSend(event)}>Send</Button>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
