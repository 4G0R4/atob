<script lang="ts">
	import { formatUnixTimestamp } from '$lib/utils';
	import { getTagValue } from 'applesauce-core/helpers';
	import { encodeNevent } from '$lib/utils.nostr';
	import { relayStore } from '@/stores/relay-store.svelte';
	import EncryptionBadge from '$lib/components/EncryptionBadge.svelte';
	import type { Event } from 'nostr-tools';
	import { parseDeliveryEvent } from '$lib/models/delivery';
	import { keyPackManager } from '@/services/keyPackManager.svelte';

	let {
		delivery,
		href,
		onhover,
		onhoverleave
	}: {
		delivery: Event;
		href?: string;
		onhover?: (deliveryId: string) => void;
		onhoverleave?: () => void;
	} = $props();

	// Default href using NIP-19 encoded event ID with relay hints
	if (!href) {
		href = `/deliveries/${encodeNevent(delivery.id, relayStore.selectedRelays, delivery.kind)}`;
	}

	const parsedDelivery = $derived(parseDeliveryEvent(delivery));

	// Use derived values instead of effects
	const isEncrypted = $derived(parsedDelivery?.sm_pub !== undefined);
	const title = $derived(getTagValue(delivery, 'title'));
	const amountTag = $derived(delivery.tags.find((t) => t[0] === 'amount'));
	const amount = $derived(amountTag?.[1]);
	const currency = $derived(amountTag?.[2] || 'SATS');
	const pickup = $derived(getTagValue(delivery, 'pickup_geohash'));
	const dropoff = $derived(getTagValue(delivery, 'dropoff_geohash'));
	const date = $derived(formatUnixTimestamp(delivery.created_at, true));

	// Check access to encrypted delivery
	const hasAccess = $derived(
		isEncrypted && parsedDelivery?.sm_pub ? keyPackManager.hasAccess(parsedDelivery.sm_pub) : true
	);
</script>

<a
	{href}
	class="group card-cyberpunk block h-full overflow-hidden transition-all hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/20"
	onmouseenter={() => onhover?.(delivery.id)}
	onmouseleave={() => onhoverleave?.()}
>
	<div class="grid h-full grid-rows-[auto_1fr_auto]">
		<div class="p-6">
			<div class="mb-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
				<time datetime={formatUnixTimestamp(delivery.created_at, true)}>{date}</time>
				<EncryptionBadge {isEncrypted} {hasAccess} />
			</div>
			<h3
				class="text-off-white mb-2 text-xl font-semibold tracking-tight transition-colors group-hover:text-purple-400 md:text-2xl"
			>
				{title}
			</h3>
			<div class="mb-4 overflow-hidden text-gray-700 dark:text-gray-300">
				{#if isEncrypted && !hasAccess}
					<div class="py-4 text-center">
						<p class="text-sm text-gray-500 italic">
							This delivery is encrypted. Request access from the creator.
						</p>
					</div>
				{:else}
					<p class="line-clamp-3 text-sm">
						Amount: {amount}
						{currency}
					</p>
					<p class="line-clamp-3 text-sm">
						Pickup: {pickup}
					</p>
					<p class="line-clamp-3 text-sm">
						Dropoff: {dropoff}
					</p>
				{/if}
			</div>
			<div class="flex items-center text-sm font-medium text-purple-400">
				View Details
				<span class="ml-1 transition-transform group-hover:translate-x-1">→</span>
			</div>
		</div>
	</div>
</a>
