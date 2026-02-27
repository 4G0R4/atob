<script lang="ts">
	import { relayStore } from '@/stores/relay-store.svelte';
	import { addressLoader } from '$lib/services/loaders.svelte';
	import type { Event } from 'nostr-tools';
	import type { Delivery } from '$lib/models/delivery';
	import { eventStore } from '@/services/eventStore';
	import { ReplaceableModel } from 'applesauce-core/models';
	import { stateMachineSnapshotKind } from '@atob/lib';
	import type { StateSnapshot } from '@/types';
	import ProfileCard from './ProfileCard.svelte';
	import type { Snippet } from 'svelte';
	import Button from './ui/button/button.svelte';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { RefreshCw } from 'lucide-svelte';

	let {
		delivery,
		deliveryStateEvent = $bindable(),
		children,
		title = 'Current State',
		isLocal = false
	}: {
		delivery: Delivery;
		deliveryStateEvent: Event | undefined;
		children?: Snippet;
		title?: string;
		isLocal?: boolean;
	} = $props();

	const stateSnapshotEvent = isLocal
		? undefined
		: eventStore.model(ReplaceableModel, {
				identifier: delivery.state.split(':').pop(),
				kind: stateMachineSnapshotKind,
				pubkey: delivery.rawEvent.pubkey
			});

	let parsedContent: StateSnapshot | null = $state(null);
	let refresh = $state(0);
	let loading = $state(false);

	$effect(() => {
		if ($stateSnapshotEvent) deliveryStateEvent = $stateSnapshotEvent;
	});

	$effect(() => {
		if (deliveryStateEvent) {
			try {
				parsedContent = JSON.parse(deliveryStateEvent.content);
			} catch (e) {
				console.error('Failed to parse state snapshot content', e);
				parsedContent = null;
			}
		}
	});

	$effect(() => {
		refresh;
		if (isLocal || !delivery || ($stateSnapshotEvent && refresh == 0)) return;
		const [kind, pubkey, identifier] = delivery.state.split(':');

		const sub = addressLoader({
			kind: parseInt(kind),
			pubkey,
			identifier,
			relays: relayStore.selectedRelays
		}).subscribe((event) => {
			if (event) {
				if (!deliveryStateEvent || event.created_at > deliveryStateEvent.created_at) {
					deliveryStateEvent = event;
				}
			}
		});

		return () => {
			sub.unsubscribe();
		};
	});
</script>

{#if deliveryStateEvent && parsedContent}
	<div class="card-cyberpunk space-y-4 p-6">
		<div class="flex flex-row items-center justify-between">
			<div>
				<h2 class="text-off-white mb-2 text-xl font-bold">{title}</h2>
				<p class="text-sm text-gray-300">
					{isLocal
						? 'This is a locally simulated state. Press "Store" to keep a copy of it.'
						: 'This is the current state of the delivery, including the participants and their roles.'}
				</p>
			</div>
			<Button
				variant="outline"
				size="icon"
				class="border-purple-400/20 bg-black/20 text-purple-300 hover:bg-purple-400/10"
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
		<div class="space-y-2 text-sm">
			<p class="text-gray-300">
				<span class="font-semibold text-gray-400">Status:</span>
				{parsedContent.status}
			</p>
			<p class="text-gray-300">
				<span class="font-semibold text-gray-400">Value:</span>
				{parsedContent.value}
			</p>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{#if parsedContent.context.creatorPubKey}
					<ProfileCard pubkey={parsedContent.context.creatorPubKey} role="Creator" />
				{/if}
				{#if parsedContent.context.receiverPubKey}
					<ProfileCard pubkey={parsedContent.context.receiverPubKey} role="Receiver" />
				{/if}
				{#if parsedContent.context.executorPubKey}
					<ProfileCard pubkey={parsedContent.context.executorPubKey} role="Executor" />
				{/if}
				{#if parsedContent.context.inputterPubKey}
					<ProfileCard pubkey={parsedContent.context.inputterPubKey} role="Inputter" />
				{/if}
			</div>
		</div>
		{#if children}
			{@render children()}
		{/if}
	</div>
{/if}
