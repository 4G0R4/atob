<script lang="ts">
	import Label from '@/components/ui/label/label.svelte';
	import Input from '@/components/ui/input/input.svelte';
	import Button from '@/components/ui/button/button.svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import { CURRENCIES } from '$lib/constants';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import { tick } from 'svelte';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Command } from 'bits-ui';

	let {
		title = $bindable(),
		description = $bindable(),
		amount = $bindable(),
		selectedCurrency = $bindable(),
		pickup_geohash = $bindable(),
		dropoff_geohash = $bindable(),
		comms = $bindable(),
		commProtocol = $bindable(),
		commAddress = $bindable(),
		rolesInput = $bindable(),
		enginesInput = $bindable(),
		deadlineInput = $bindable(),
		selectedStateMachineTemplate = $bindable(),
		stateMachineOptions = [],
		loading = $bindable(),
		showPickupMap = $bindable(),
		showDropoffMap = $bindable(),
		onSubmit = () => {}
	}: {
		title?: string;
		description?: string;
		amount?: string;
		selectedCurrency?: (typeof CURRENCIES)[number];
		pickup_geohash?: string;
		dropoff_geohash?: string;
		comms: Array<string[]>;
		commProtocol?: string;
		commAddress?: string;
		rolesInput?: string;
		enginesInput?: string;
		deadlineInput?: string;
		selectedStateMachineTemplate?: string | undefined;
		stateMachineOptions: Array<{ value: string | undefined; label: string }>;
		loading?: boolean;
		showPickupMap?: boolean;
		showDropoffMap?: boolean;
		onSubmit?: () => void;
	} = $props();

	// Ensure potentially-bindable arrays / values have sane defaults at runtime
	comms = comms ?? [];
	stateMachineOptions = stateMachineOptions ?? [];

	const currencyOptions = CURRENCIES.map((currency) => ({ value: currency, label: currency }));
	const triggerContent = $derived(
		currencyOptions.find((c) => c.value === selectedCurrency)?.label ?? 'Select currency'
	);
	// Communication protocol combobox helpers
	const protocols = [
		{ value: 'email', label: 'email' },
		{ value: 'signal', label: 'signal' },
		{ value: 'nostr', label: 'nostr' },
		{ value: 'simplex', label: 'simplex' }
	];

	let open = $state(false);
	let protocolValue: string = $state(commProtocol ?? '');
	let triggerRef: HTMLButtonElement | null = $state(null);

	// Derived label for trigger display (either selected known label or the typed value)
	const selectedProtocolLabel = $derived(
		(protocols.find((p) => p.value === protocolValue)?.label ?? protocolValue) || 'Select protocol'
	);

	async function closeAndFocusTrigger() {
		open = false;
		await tick();
		triggerRef?.focus();
	}

	// Roles combobox helpers (multi-value)
	const roleOptions = [
		{ value: 'executor', label: 'executor' },
		{ value: 'receiver', label: 'receiver' }
	];

	// Initialize roles from the bindable CSV string, ensuring sane defaults
	let roles = $state(
		(rolesInput ?? '')
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean)
	);

	$effect(() => {
		rolesInput = roles.join(',');
	});

	let roleOpen = $state(false);
	let roleValue: string = $state('');
	let roleTriggerRef: HTMLButtonElement | null = $state(null);

	// Display joined roles or placeholder
	const selectedRolesLabel = $derived(roles.length ? roles.join(', ') : 'Select roles');

	async function closeAndFocusRoleTrigger() {
		roleOpen = false;
		await tick();
		roleTriggerRef?.focus();
	}

	function addRoleFromValue() {
		const v = roleValue?.trim();
		if (!v) return;
		if (!roles.includes(v)) roles = [...roles, v];
		roleValue = '';
		closeAndFocusRoleTrigger();
	}

	function addRole(role: string) {
		const v = role.trim();
		if (!v) return;
		if (!roles.includes(v)) roles = [...roles, v];
		roleValue = '';
		closeAndFocusRoleTrigger();
	}

	function removeRoleAt(index: number) {
		roles = roles.filter((_, i) => i !== index);
	}

	function handleFormSubmit(e: Event) {
		e.preventDefault();
		onSubmit();
	}

	function addComm() {
		if (!commProtocol) return;
		const tag = ['comm', commProtocol];
		if (commAddress)
			tag.push(
				...commAddress
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean)
			);
		comms = [...comms, tag];
		commProtocol = '';
		commAddress = '';
	}

	function removeComm(index: number) {
		comms = comms.filter((_, i) => i !== index);
	}
</script>

<div class="relative flex-1">
	<div class="p-8 pb-4">
		<form id="create-offer-form" onsubmit={handleFormSubmit} class="space-y-6">
			<fieldset disabled={loading} class="space-y-6">
				<div>
					<Label for="offer-title" class="pb-2">Title</Label>
					<Input id="offer-title" bind:value={title} placeholder="e.g., Urgent Document Delivery" />
					<p class="mt-1 text-xs text-gray-400">
						A concise and descriptive title for your delivery offer.
					</p>
				</div>

				<div>
					<Label for="offer-description" class="pb-2">Description</Label>
					<textarea
						id="offer-description"
						bind:value={description}
						placeholder="e.g., Deliver a confidential document to our downtown office."
						class="text-off-white flex min-h-[80px] w-full rounded-md border border-purple-400/20 bg-black/20 px-3 py-2 text-sm placeholder:text-gray-500 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						rows="4"
					></textarea>
					<p class="mt-1 text-xs text-gray-400">
						A detailed, free-form description of the delivery. This will be stored in a
						`description` tag.
					</p>
				</div>

				<div>
					<Label for="offer-amount" class="pb-2">Amount (Optional)</Label>
					<div class="flex gap-2">
						<Input
							id="offer-amount"
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
					<p class="mt-1 text-xs text-gray-400">The proposed payment for the delivery, in SATS.</p>
				</div>

				<div>
					<Label for="offer-pickup" class="pb-2">Pickup Geohash (Optional)</Label>
					<div class="flex items-center gap-2">
						<Input
							id="offer-pickup"
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
					<Label for="offer-dropoff" class="pb-2">Dropoff Geohash (Optional)</Label>
					<div class="flex items-center gap-2">
						<Input
							id="offer-dropoff"
							bind:value={dropoff_geohash}
							placeholder="Select on map or enter manually"
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
					<Label class="pb-2">Communication Channels</Label>
					<div class="flex gap-2">
						<Popover.Root bind:open>
							<Popover.Trigger bind:ref={triggerRef}>
								{#snippet child({ props })}
									<Button
										{...props}
										variant="outline"
										class="w-[200px] justify-between"
										role="combobox"
										aria-expanded={open}
									>
										{selectedProtocolLabel || 'Select a framework...'}
										<ChevronsUpDownIcon class="ml-2 size-4 shrink-0 opacity-50" />
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-[200px] p-0">
								<Command.Root class="p-2">
									<!-- allow typing custom protocols -->
									<Command.Input
										class="w-full bg-background"
										bind:value={protocolValue}
										placeholder="Search or type protocol..."
										onkeydown={(e) => {
											if (e.key === 'Enter' && protocolValue && protocolValue.trim()) {
												commProtocol = protocolValue.trim();
												closeAndFocusTrigger();
											}
										}}
									/>
									<Command.List>
										<Command.Empty>No protocol found.</Command.Empty>
										<Command.Group value="protocols">
											{#each protocols as protocol (protocol.value)}
												<Command.Item
													value={protocol.value}
													onSelect={() => {
														protocolValue = protocol.value;
														commProtocol = protocol.value;
														closeAndFocusTrigger();
													}}
												>
													{protocol.label}
												</Command.Item>
											{/each}
										</Command.Group>
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>

						<Input
							placeholder="address or extra (optional, comma-separated)"
							bind:value={commAddress}
							class="flex-1"
						/>
						<Button type="button" onclick={addComm} variant="outline">Add</Button>
					</div>
					<p class="mt-1 text-xs text-gray-400">
						Define channels for off-band coordination (e.g., `email, user@example.com`).
					</p>

					{#if comms.length}
						<ul class="mt-2 space-y-1">
							{#each comms as c, i (i)}
								<li
									class="flex items-center justify-between rounded border border-purple-400/10 px-3 py-1"
								>
									<div class="text-sm">
										<span class="font-semibold">{c[1]}</span>
										{#if c.length > 2}
											<span class="ml-2 text-gray-400">{c.slice(2).join(', ')}</span>
										{/if}
									</div>
									<Button type="button" variant="ghost" onclick={() => removeComm(i)}>Remove</Button
									>
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				<div>
					<Label class="pb-2">Roles</Label>
					<div class="flex gap-2">
						<Popover.Root bind:open={roleOpen}>
							<Popover.Trigger bind:ref={roleTriggerRef}>
								{#snippet child({ props })}
									<Button
										{...props}
										variant="outline"
										class="w-[300px] justify-between"
										role="combobox"
										aria-expanded={roleOpen}
									>
										{selectedRolesLabel}
										<ChevronsUpDownIcon class="ml-2 size-4 shrink-0 opacity-50" />
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-[300px] p-0">
								<Command.Root class="p-2">
									<!-- allow typing custom roles -->
									<Command.Input
										class="w-full bg-background"
										bind:value={roleValue}
										placeholder="Search or type role..."
										onkeydown={(e) => {
											const ke = e as KeyboardEvent;
											if (ke.key === 'Enter') {
												ke.preventDefault();
												if (roleValue && roleValue.trim()) addRoleFromValue();
											}
										}}
									/>
									<Command.List>
										<Command.Empty>No role found.</Command.Empty>
										<Command.Group value="roles">
											{#each roleOptions as opt (opt.value)}
												<Command.Item
													value={opt.value}
													onSelect={() => {
														addRole(opt.value);
													}}
												>
													{opt.label}
												</Command.Item>
											{/each}
										</Command.Group>
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>
						<Button type="button" onclick={() => roleValue && addRoleFromValue()} variant="outline"
							>Add</Button
						>
					</div>

					<p class="mt-1 text-xs text-gray-400">
						Specify roles you are looking to fill. You can select common roles or type custom ones.
					</p>

					{#if roles.length}
						<ul class="mt-2 flex flex-wrap gap-2">
							{#each roles as r, i (i)}
								<li class="flex items-center gap-2 rounded border border-purple-400/10 px-2 py-1">
									<span class="text-sm font-medium">{r}</span>
									<Button type="button" variant="ghost" onclick={() => removeRoleAt(i)}
										>Remove</Button
									>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
				<div>
					<Label class="pb-2">Optional State Machine Preview (content)</Label>
					<Select.Root type="single" name="state-machine" bind:value={selectedStateMachineTemplate}>
						<Select.Trigger class="w-full">
							{stateMachineOptions.find((o) => o.value === selectedStateMachineTemplate)?.label ??
								'Select a template'}
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each stateMachineOptions as option (option.label)}
									<Select.Item value={option.value || ''} label={option.label}
										>{option.label}</Select.Item
									>
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Root>
					<p class="mt-1 text-xs text-gray-400">
						If provided, this is stored in the event `content` field. It should be a stringified
						JSON of a state machine definition.
					</p>
				</div>
			</fieldset>
		</form>
	</div>
</div>
