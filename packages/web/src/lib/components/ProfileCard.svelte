<script lang="ts">
	import { addressLoader } from '$lib/services/loaders.svelte';
	import { metadataRelays } from '$lib/services/relay-pool';
	import { eventStore } from '../services/eventStore';
	import { ProfileModel } from 'applesauce-core/models';
	import { copyToClipboard, pubkeyToHexColor } from '$lib/utils';
	import { validateAndDecodePubkey, encodeNpub } from '$lib/utils.nostr';
	import { Metadata } from 'nostr-tools/kinds';
	import { Badge } from '$lib/components/ui/badge';
	import Button from './ui/button/button.svelte';

	let {
		pubkey,
		role
	}: {
		pubkey: string;
		role?: string;
	} = $props();

	// Decode the pubkey to hex format for internal use
	const hexPubkey = validateAndDecodePubkey(pubkey) || pubkey;
	const profile = eventStore.model(ProfileModel, hexPubkey);
	$effect(() => {
		if ($profile) return;
		const sub = addressLoader({
			kind: Metadata,
			pubkey,
			relays: metadataRelays
		}).subscribe();
		return () => sub.unsubscribe();
	});
</script>

{#snippet pfp(pubkey: string, pfp?: string)}
	{#if pfp}
		<img src={pfp} alt="pfp" class="h-8 w-8 rounded-full object-cover" />
	{:else}
		<div class="h-8 w-8 rounded-full" style="background-color: {pubkeyToHexColor(pubkey)}"></div>
	{/if}
{/snippet}

<div class="flex items-center gap-2">
	{@render pfp(hexPubkey, $profile?.picture)}
	<div class="flex flex-col">
		<Button variant="link" class="p-0 text-current" onclick={() => copyToClipboard(pubkey)}>
			<span class="font-semibold"
				>{$profile?.name ||
					$profile?.display_name ||
					encodeNpub(hexPubkey).slice(0, 12) + '...'}</span
			>
			{#if $profile?.nip05}
				<span class="text-sm text-gray-400">
					{$profile?.nip05}
				</span>
			{/if}
			{#if role}
				<Badge variant="secondary">{role}</Badge>
			{/if}
		</Button>
	</div>
</div>
