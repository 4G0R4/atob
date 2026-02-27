<script lang="ts">
	import Label from '@/components/ui/label/label.svelte';
	import Input from '@/components/ui/input/input.svelte';
	import Button from '@/components/ui/button/button.svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import ProfileSearch from '@/components/ProfileSearch.svelte';
	import EncryptionSettings from '$lib/components/EncryptionSettings.svelte';
	import { CURRENCIES } from '$lib/constants';
	// TODO: Add state machine selection
	// Callback prop to replace deprecated dispatcher (parent passes a function)
	let {
		onSubmit = () => {},
		title = $bindable(''),
		description = $bindable(''),
		amount = $bindable(''),
		selectedCurrency = $bindable(CURRENCIES[0]),
		pickup_geohash = $bindable(''),
		dropoff_geohash = $bindable(''),
		receiverPubKey = $bindable(''),
		receiverPubKeyError = $bindable(''),
		loading = $bindable(false),
		showPickupMap = $bindable(false),
		showDropoffMap = $bindable(false),
		enableEncryption = $bindable(false),
		selectedParticipants = $bindable<string[]>([])
	}: {
		onSubmit?: () => void;
		title?: string;
		description?: string;
		amount?: string;
		selectedCurrency?: (typeof CURRENCIES)[number];
		pickup_geohash?: string;
		dropoff_geohash?: string;
		receiverPubKey?: string;
		receiverPubKeyError?: string;
		loading?: boolean;
		showPickupMap?: boolean;
		showDropoffMap?: boolean;
		enableEncryption?: boolean;
		selectedParticipants?: string[];
	} = $props();

	// Options derived locally so component is self-contained
	const currencyOptions = CURRENCIES.map((currency) => ({ value: currency, label: currency }));
	const triggerContent = $derived(
		currencyOptions.find((c) => c.value === selectedCurrency)?.label ?? 'Select currency'
	);

	function handleFormSubmit(e: Event) {
		e.preventDefault();
		onSubmit();
	}
</script>

<div class="relative flex-1">
	<div class="p-8 pb-4">
		<form id="create-delivery-form" onsubmit={handleFormSubmit} class="space-y-6">
			<fieldset disabled={loading} class="space-y-6">
				<div>
					<Label for="title" class="pb-2">Title</Label>
					<Input id="title" bind:value={title} placeholder="e.g., Urgent Document Delivery" />
					<p class="mt-1 text-xs text-gray-400">
						A concise and descriptive title for your delivery.
					</p>
				</div>

				<div>
					<Label for="description" class="pb-2">Description</Label>
					<textarea
						id="description"
						bind:value={description}
						placeholder="e.g., Deliver a confidential document to our downtown office."
						class="text-off-white flex min-h-[80px] w-full rounded-md border border-purple-400/20 bg-black/20 px-3 py-2 text-sm placeholder:text-gray-500 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						rows="4"
					></textarea>
					<p class="mt-1 text-xs text-gray-400">
						A detailed description of the delivery, requirements, etc.
					</p>
				</div>

				<div>
					<Label for="amount" class="pb-2">Amount</Label>
					<div class="flex gap-2">
						<Input
							id="amount"
							bind:value={amount}
							type="number"
							placeholder="e.g., 1000"
							class="flex-1"
						/>
						<Select.Root type="single" name="currency" bind:value={selectedCurrency}>
							<Select.Trigger class="min-w-[80px]">{triggerContent}</Select.Trigger>
							<Select.Content>
								<Select.Group>
									{#each currencyOptions as currency (currency.value)}
										<Select.Item value={currency.value} label={currency.label}
											>{currency.label}</Select.Item
										>
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</div>
					<p class="mt-1 text-xs text-gray-400">The proposed payment for the delivery.</p>
				</div>

				<div>
					<Label for="pickup" class="pb-2">Pickup Geohash</Label>
					<div class="flex items-center gap-2">
						<Input
							id="pickup"
							bind:value={pickup_geohash}
							placeholder="Select on map or enter manually"
						/>
						<Button type="button" variant="outline" onclick={() => (showPickupMap = true)}
							>Select on Map</Button
						>
					</div>
					<p class="mt-1 text-xs text-gray-400">
						The geohash for the pickup location. You can use the map to select it or enter it
						manually.
					</p>
				</div>

				<div>
					<Label for="dropoff" class="pb-2">Dropoff Geohash</Label>
					<div class="flex items-center gap-2">
						<Input
							id="dropoff"
							bind:value={dropoff_geohash}
							placeholder="Select on map or enter it manually"
						/>
						<Button type="button" variant="outline" onclick={() => (showDropoffMap = true)}
							>Select on Map</Button
						>
					</div>
					<p class="mt-1 text-xs text-gray-400">
						The geohash for the dropoff location. You can use the map to select it or enter it
						manually.
					</p>
				</div>

				<div>
					<Label for="receiver" class="pb-2">Receiver Public Key</Label>
					<ProfileSearch
						bind:value={receiverPubKey}
						placeholder="Search profiles or paste npub..."
					/>
					<p class="mt-1 text-xs text-gray-400">
						Supports hex pubkeys, npub (npub1...), or nprofile (nprofile1...) formats
					</p>
					{#if receiverPubKeyError}
						<p class="mt-1 text-sm text-red-500">{receiverPubKeyError}</p>
					{/if}
				</div>

				<!-- Encryption Section -->
				<EncryptionSettings
					bind:enabled={enableEncryption}
					bind:participants={selectedParticipants}
				/>
			</fieldset>
		</form>
	</div>

	<!-- Fixed Footer with Create Button lives in parent to keep action centralized -->
</div>
