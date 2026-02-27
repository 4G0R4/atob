<script lang="ts">
	import { goto } from '$app/navigation';
	import { activeAccount } from '$lib/services/accountManager.svelte';
	import {
		createDeliveryContractAndInitialState,
		createAtobMachineDefinition,
		publicOfferKind,
		stateMachineDefinitionKind
	} from '@atob/lib';
	import { CURRENCIES } from '$lib/constants';
	import Button from '@/components/ui/button/button.svelte';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { slugify } from '@/utils';
	import { toast } from 'svelte-sonner';
	import {
		publishEvent,
		validateAndDecodePubkey,
		NostrIdentifierTypeGuard,
		createEvent
	} from '@/utils.nostr';
	import GeohashSelector from '@/components/GeohashSelector.svelte';
	import SingleDeliveryMap from '@/components/SingleDeliveryMap.svelte';
	import type { NostrEvent } from 'nostr-tools';
	import * as Tabs from '$lib/components/ui/tabs/index.js';

	import StateMachineForm from './StateMachineForm.svelte';
	import PublicOfferForm from './PublicOfferForm.svelte';
	import { neventEncode } from 'nostr-tools/nip19';
	import { keyPackManager } from '$lib/services/keyPackManager.svelte';
	import { encryptedEventStore } from '$lib/services/encryptedEventStore';

	let title = $state('');
	let description = $state('');
	let amount = $state('');
	let selectedCurrency = $state<(typeof CURRENCIES)[number]>('SATS');
	let activeTab = $state('public-offer');

	let pickup_geohash = $state('');
	let dropoff_geohash = $state('');
	let receiverPubKey = $state('');
	let loading = $state(false);
	let receiverPubKeyError = $state('');
	let showPickupMap = $state(false);
	let showDropoffMap = $state(false);

	// Encryption settings
	let enableEncryption = $state(false);
	let selectedParticipants = $state<string[]>([]);

	// New fields for Public Offer
	let comms = $state<Array<string[]>>([]);
	let commProtocol = $state('');
	let commAddress = $state('');
	let rolesInput = $state(''); // comma separated roles
	let enginesInput = $state(''); // comma separated engines, each as name|param1,param2
	let deadlineInput = $state(''); // datetime-local input
	let selectedStateMachineTemplate = $state<string | undefined>(undefined);

	const atobMachineDefinitionTemplate = JSON.stringify(
		createAtobMachineDefinition($activeAccount?.pubkey || '<creator-pubkey>', '<receiver-pubkey>'),
		null,
		2
	);

	const stateMachineOptions = [
		{ value: undefined, label: 'None' },
		{ value: atobMachineDefinitionTemplate, label: 'AtoB Delivery v1' }
	];

	// Create a mock event for the map preview
	const mockDeliveryEvent = $derived<NostrEvent>({
		id: 'preview',
		pubkey: $activeAccount?.pubkey || '',
		created_at: Math.floor(Date.now() / 1000),
		kind: stateMachineDefinitionKind,
		tags: [
			['pickup_geohash', pickup_geohash],
			['dropoff_geohash', dropoff_geohash]
		],
		content: '',
		sig: ''
	});

	// Check if any location has been entered
	const hasLocations = $derived(pickup_geohash || dropoff_geohash);

	$effect(() => {
		if (receiverPubKey && !NostrIdentifierTypeGuard.isValidPubkeyIdentifier(receiverPubKey)) {
			receiverPubKeyError = 'Invalid public key. Please enter a hex pubkey, npub, or nprofile.';
		} else {
			receiverPubKeyError = '';
		}
	});

	async function createPublicOffer() {
		const account = $activeAccount;
		if (!account) {
			toast.error('Please log in to create a delivery.');
			return;
		}

		if (!title) {
			toast.error('Title is required.');
			return;
		}

		loading = true;
		try {
			const slug = slugify(title);
			const tags: string[][] = [
				['d', slug],
				['title', title],
				['description', description]
			];

			if (amount) {
				tags.push(['amount', `${String(amount)}`, `${selectedCurrency}`]);
			}
			if (pickup_geohash) {
				tags.push(['pickup_geohash', pickup_geohash]);
			}
			if (dropoff_geohash) {
				tags.push(['dropoff_geohash', dropoff_geohash]);
			}

			// Roles (comma separated)
			const roles = (rolesInput || '')
				.split(',')
				.map((r) => r.trim())
				.filter(Boolean);
			for (const r of roles) {
				tags.push(['role', r]);
			}

			// Engines input format: name|param1,param2  (multiple engines separated by comma)
			const engines = (enginesInput || '')
				.split(',')
				.map((e) => e.trim())
				.filter(Boolean);
			for (const e of engines) {
				const [name, params] = e.split('|').map((s) => s.trim());
				if (name) {
					const tag = ['engine', name];
					if (params) {
						const p = params
							.split(',')
							.map((s) => s.trim())
							.filter(Boolean);
						tag.push(...p);
					}
					tags.push(tag);
				}
			}

			// comms
			tags.push(...comms);

			// deadline
			if (deadlineInput) {
				const d = Math.floor(new Date(deadlineInput).getTime() / 1000);
				if (!Number.isNaN(d)) {
					tags.push(['deadline', String(d)]);
				}
			}

			const content = selectedStateMachineTemplate ?? '';

			const event = await createEvent(account.signer, {
				kind: publicOfferKind,
				tags,
				content,
				created_at: Math.floor(Date.now() / 1000)
			});

			const eventId = await publishEvent(event);

			toast.success('Public delivery offer created successfully!');
			eventId && goto(`/deliveries/public`);
		} catch (error) {
			console.error('Failed to create public offer:', error);
			toast.error('Failed to create public offer. Please try again.');
		} finally {
			loading = false;
		}
	}

	async function createDelivery() {
		const account = $activeAccount;
		if (!account) {
			toast.error('Please log in to create a delivery.');
			return;
		}

		if (!title || !receiverPubKey) {
			toast.error('Title and Receiver Public Key are required.');
			return;
		}

		if (receiverPubKeyError) {
			toast.error('Please fix the errors in the form.');
			return;
		}
		console.log('create delivery');
		loading = true;
		try {
			const slug = slugify(title);
			// Decode the receiver pubkey to hex format
			const decodedReceiverPubkey = validateAndDecodePubkey(receiverPubKey);
			if (!decodedReceiverPubkey) {
				throw new Error('Invalid receiver public key');
			}

			let sm_pub: string | undefined;
			let sm_sec: string | undefined;

			// Handle encryption if enabled
			if (enableEncryption) {
				// Create key packs for all participants including creator
				console.log('creating key packs');
				const allParticipants = [...selectedParticipants, decodedReceiverPubkey];
				const { sm_pub: generatedSmPub, sm_sec: generatedSmSec } =
					await keyPackManager.createKeyPack(
						allParticipants,
						{
							name: title,
							description: description || 'Encrypted delivery'
						},
						account.pubkey
					);
				sm_pub = generatedSmPub;
				sm_sec = generatedSmSec;
			}

			const { contractEvent, stateEvent } = await createDeliveryContractAndInitialState(
				account.signer,
				slug,
				decodedReceiverPubkey,
				title,
				description,
				[
					['amount', `${String(amount)}`, `${selectedCurrency}`],
					['pickup_geohash', pickup_geohash],
					['dropoff_geohash', dropoff_geohash],
					...(sm_pub ? [['sm_pub', sm_pub]] : [])
				]
			);
			let contractId: string | undefined;

			// Encrypt and wrap events if encryption is enabled
			if (enableEncryption && sm_pub && sm_sec) {
				// Encrypt and wrap the contract event
				console.log('encrypting contract event');
				const encryptedContractEvent = await encryptedEventStore.encryptAndWrapEvent(
					contractEvent,
					sm_sec,
					sm_pub
				);
				if (!encryptedContractEvent) {
					toast.error('Failed to encrypt contract event.');
					return;
				}
				contractId = contractEvent.id;
				await publishEvent(encryptedContractEvent);

				// Encrypt and wrap the state event
				const encryptedStateEvent = await encryptedEventStore.encryptAndWrapEvent(
					stateEvent,
					sm_sec,
					sm_pub
				);
				if (!encryptedStateEvent) {
					toast.error('Failed to encrypt state event.');
					return;
				}
				await publishEvent(encryptedStateEvent);
			} else {
				// Publish events normally without encryption
				contractId = await publishEvent(contractEvent);
				await publishEvent(stateEvent);
			}

			toast.success('Delivery created successfully!');
			if (contractId) {
				goto(`/deliveries/${neventEncode({ id: contractId, kind: stateMachineDefinitionKind })}`);
			} else {
				throw new Error('Failed to publish delivery contract');
			}
		} catch (error) {
			console.error('Failed to create delivery:', error);
			toast.error('Failed to create delivery. Please try again.');
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-0 flex-col" style="height: calc(100dvh - 120px);">
	<!-- Header -->
	<div class="flex-shrink-0 pb-6">
		<h1 class="text-off-white text-4xl font-bold">Create Delivery</h1>
	</div>

	<!-- Two Column Layout: Form (Left) + Map (Right) -->
	<div class="flex min-h-0 flex-1 gap-6">
		<!-- Left: Scrollable Form -->
		<div class="flex min-h-0 flex-1 flex-col lg:flex-1">
			<div class="card-cyberpunk flex min-h-0 flex-1 flex-col overflow-auto">
				<Tabs.Root bind:value={activeTab} class="flex flex-1">
					<Tabs.List class=" w-full">
						<Tabs.Trigger value="public-offer">Public Offer</Tabs.Trigger>
						<Tabs.Trigger value="state-machine">State Machine</Tabs.Trigger>
					</Tabs.List>

					<!-- State Machine Tab -->
					<Tabs.Content value="state-machine" class="flex min-h-0 flex-1 flex-col">
						<!-- Use StateMachineForm component -->
						<StateMachineForm
							bind:title
							bind:description
							bind:amount
							bind:selectedCurrency
							bind:pickup_geohash
							bind:dropoff_geohash
							bind:receiverPubKey
							bind:receiverPubKeyError
							bind:loading
							bind:showPickupMap
							bind:showDropoffMap
							bind:enableEncryption
							bind:selectedParticipants
							onSubmit={createDelivery}
						/>

						<!-- Fixed Footer with Create Button (kept here to share consistent layout) -->
						<div class="flex-shrink-0 border-t border-purple-400/20 bg-black/20 p-6">
							<Button
								type="button"
								onclick={createDelivery}
								disabled={loading || !!receiverPubKeyError}
								class="w-full"
							>
								{#if loading}
									<Spinner class="mr-2 size-4" />
									Creating...
								{:else}
									Create State Machine
								{/if}
							</Button>
						</div>
					</Tabs.Content>

					<!-- Public Offer Tab -->
					<Tabs.Content value="public-offer" class="flex min-h-0 flex-1 flex-col">
						<!-- Use PublicOfferForm component -->
						<PublicOfferForm
							bind:title
							bind:description
							bind:amount
							bind:selectedCurrency
							bind:pickup_geohash
							bind:dropoff_geohash
							bind:comms
							bind:commProtocol
							bind:commAddress
							bind:rolesInput
							bind:enginesInput
							bind:deadlineInput
							bind:selectedStateMachineTemplate
							{stateMachineOptions}
							bind:loading
							bind:showPickupMap
							bind:showDropoffMap
							onSubmit={createPublicOffer}
						/>

						<!-- Fixed Footer with Create Button -->
						<div class="flex-shrink-0 border-t border-purple-400/20 bg-black/20 p-6">
							<Button type="button" onclick={createPublicOffer} disabled={loading} class="w-full">
								{#if loading}
									<Spinner class="mr-2 size-4" />
									Publishing...
								{:else}
									Publish Public Offer
								{/if}
							</Button>
						</div>
					</Tabs.Content>
				</Tabs.Root>
			</div>
		</div>

		<!-- Right: Map Preview (Desktop Only) -->
		<div class="card-cyberpunk relative hidden overflow-hidden lg:block lg:flex-1">
			<SingleDeliveryMap delivery={mockDeliveryEvent} />
			{#if !hasLocations}
				<div
					class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
				>
					<div class="card-cyberpunk p-6 text-center">
						<p class="text-off-white mb-2 text-lg font-semibold">Location Preview</p>
						<p class="text-sm text-gray-300">
							Enter pickup or dropoff locations to see them on the map
						</p>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<GeohashSelector
		open={showPickupMap}
		geohash={pickup_geohash}
		onchange={(g: string) => {
			pickup_geohash = g;
			showPickupMap = false;
		}}
		onclose={() => (showPickupMap = false)}
	/>

	<GeohashSelector
		open={showDropoffMap}
		geohash={dropoff_geohash}
		onchange={(g: string) => {
			dropoff_geohash = g;
			showDropoffMap = false;
		}}
		onclose={() => (showDropoffMap = false)}
	/>
</div>
