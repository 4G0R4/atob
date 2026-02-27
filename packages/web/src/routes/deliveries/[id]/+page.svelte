<script lang="ts">
	import { createTimelineLoaderByFilter, singleDeliveryFilter } from '$lib/services/loaders.svelte';
	import { eventStore } from '@/services/eventStore';
	import { page } from '$app/state';
	import { DeliveryModel, type Delivery } from '$lib/models/delivery';
	import { PublicOfferModel } from '$lib/models/public-offer';
	import { validateAndDecodeEventId } from '@/utils.nostr';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import type { DecodedResult, EventPointer } from 'nostr-tools/nip19';
	import PublicOffer from '$lib/components/PublicOffer.svelte';
	import DeliveryContract from '$lib/components/DeliveryContract.svelte';
	import { publicOfferKind } from '@atob/lib';
	const {
		params: { id }
	} = page;

	// Decode the delivery ID to handle nip19 identifiers (note, nevent, or hex)
	const decoded: DecodedResult = validateAndDecodeEventId(id!) || {
		type: 'nevent',
		data: { id: id! }
	};

	const decodedKind = (decoded.data as EventPointer).kind;

	const delivery =
		decodedKind === publicOfferKind
			? eventStore.model(PublicOfferModel, (decoded.data as EventPointer).id)
			: eventStore.model(DeliveryModel, (decoded.data as EventPointer).id);

	// 1. Load the contract event (Kind 7500) and create the machine definition
	$effect(() => {
		if (!id || $delivery) return;
		const sub = createTimelineLoaderByFilter(
			singleDeliveryFilter((decoded.data as EventPointer).id)
		).subscribe();
		return () => {
			sub.unsubscribe();
		};
	});
</script>

{#if $delivery}
	{#if decodedKind === publicOfferKind}
		<PublicOffer delivery={$delivery} />
	{:else}
		<DeliveryContract delivery={$delivery as Delivery} />
	{/if}
{:else if id}
	<div class="flex min-h-[400px] items-center justify-center">
		<div class="flex items-center gap-2">
			<Spinner class="size-4" />
			<p class="text-adaptive-gray">Loading delivery details...</p>
		</div>
	</div>
{:else}
	<div class="flex min-h-[400px] items-center justify-center">
		<p class="text-adaptive-gray">Delivery not found.</p>
	</div>
{/if}
