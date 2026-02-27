<script lang="ts">
	import { Lock, Users, X } from 'lucide-svelte';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { validateAndDecodePubkey, getPubkeyDisplay } from '$lib/utils.nostr';

	let { enabled = $bindable(false), participants = $bindable<string[]>([]) } = $props();

	let newParticipant = $state('');
	let error = $state('');
	let previousEnabled = $state(enabled);

	$effect(() => {
		if (!enabled && previousEnabled) {
			participants = [];
		}
		previousEnabled = enabled;
	});

	function addParticipant() {
		const pubkey = validateAndDecodePubkey(newParticipant);
		if (pubkey) {
			if (participants.includes(pubkey)) {
				error = 'Participant already added';
				return;
			}
			participants = [...participants, pubkey];
			newParticipant = '';
			error = '';
		} else {
			error = 'Invalid public key format (npub or hex)';
		}
	}

	function removeParticipant(index: number) {
		participants = participants.filter((_, i) => i !== index);
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			addParticipant();
		}
	}
</script>

<Card class="border-2">
	<CardHeader class="pb-3">
		<CardTitle class="flex items-center gap-2 text-lg">
			<Lock class="h-5 w-5 text-blue-600" />
			Privacy Settings
		</CardTitle>
	</CardHeader>
	<CardContent class="space-y-4">
		<div class="flex items-center justify-between">
			<div class="space-y-1">
				<Label for="enable-encryption" class="text-base font-medium">
					Enable End-to-End Encryption
				</Label>
				<p class="text-sm text-muted-foreground">
					Only authorized participants will be able to view this delivery
				</p>
			</div>
			<Switch id="enable-encryption" bind:checked={enabled} />
		</div>

		{#if enabled}
			<div class="border-t border-blue-200 pt-4">
				<div class="mb-4 flex flex-col gap-2">
					<div class=" flex gap-2">
						<Users class="h-5 w-5 text-purple-600" />
						<Label class="text-base font-medium">Extra Participants</Label>
					</div>
					<span>You can add more participants in addition to the creator and receiver.</span>
				</div>

				<div class="space-y-4">
					<div class="space-y-2">
						<Label for="participant-input" class="text-sm font-medium">
							Add Participant Public Key
						</Label>
						<div class="flex gap-2">
							<Input
								id="participant-input"
								type="text"
								bind:value={newParticipant}
								onkeypress={handleKeyPress}
								placeholder="Enter npub or hex public key..."
								class="flex-1"
							/>
							<Button onclick={addParticipant} type="button">Add</Button>
						</div>
						{#if error}
							<p class="text-sm text-red-600">{error}</p>
						{/if}
						<p class="text-xs text-muted-foreground">
							Enter a Nostr public key in npub or hex format
						</p>
					</div>

					{#if participants.length > 0}
						<div class="space-y-2">
							<Label class="text-sm font-medium">Current Participants ({participants.length})</Label
							>
							<div class="flex flex-wrap gap-2">
								{#each participants as participant, index}
									<Badge variant="secondary" class="flex items-center gap-1 px-3 py-1">
										<span class="font-mono text-xs">{getPubkeyDisplay(participant)}</span>
										<Button
											variant="ghost"
											size="sm"
											class="h-4 w-4 p-0 hover:bg-transparent"
											onclick={() => removeParticipant(index)}
										>
											<X class="h-3 w-3" />
										</Button>
									</Badge>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</CardContent>
</Card>
