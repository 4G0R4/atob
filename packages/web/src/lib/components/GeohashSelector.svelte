<script lang="ts">
	import { MapLibre, Marker, NavigationControl, FullScreenControl } from 'svelte-maplibre-gl';
	import { encodeBase32, decodeBase32 } from 'geohashing';
	import Button from '@/components/ui/button/button.svelte';
	import * as Dialog from '@/components/ui/dialog';
	import type { LngLat } from 'maplibre-gl';
	import Input from '@/components/ui/input/input.svelte';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import type { Coords } from '@/types';
	import { defaultCenter } from '@/constants';

	type NominatimResult = {
		place_id: number;
		licence: string;
		osm_type: string;
		osm_id: number;
		boundingbox: [string, string, string, string];
		lat: string;
		lon: string;
		display_name: string;
		class: string;
		type: string;
		importance: number;
		icon?: string;
	};

	let {
		open,
		geohash: geohashProp = '',
		onchange,
		onclose,
		readonly = false
	}: {
		open: boolean;
		geohash?: string;
		onchange?: (geohash: string) => void;
		onclose: () => void;
		readonly?: boolean;
	} = $props();

	function getCoordsFromHash(hash: string): Coords | null {
		if (!hash || hash.length < 3) return null;
		try {
			const { lat, lng } = decodeBase32(hash);
			return { lat, lng };
		} catch (e) {
			// Ignore invalid geohash errors during typing
			return null;
		}
	}

	const initialCoords = getCoordsFromHash(geohashProp) ?? defaultCenter;

	let lnglat: Coords = $state(initialCoords);
	let mapCenter: Coords = $state(initialCoords);
	let geohash = $derived(encodeBase32(lnglat.lat, lnglat.lng, 9));

	// Search state
	let searchQuery = $state('');
	let searchResults = $state<NominatimResult[]>([]);
	let searchLoading = $state(false);
	let showSearchResults = $state(false);
	let searchInputRef = $state<HTMLInputElement | null>(null);

	function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
		let timeoutId: number | undefined;
		return function (this: any, ...args: Parameters<T>) {
			clearTimeout(timeoutId);
			timeoutId = window.setTimeout(() => fn.apply(this, args), delay);
		} as T;
	}

	const search = debounce(async (query: string) => {
		if (query.length < 3) {
			searchResults = [];
			return;
		}
		searchLoading = true;
		try {
			const res = await fetch(
				`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json`
			);
			if (res.ok) {
				searchResults = await res.json();
			}
		} catch (error) {
			console.error('Failed to fetch from Nominatim:', error);
		} finally {
			searchLoading = false;
		}
	}, 300);

	$effect(() => {
		if (searchQuery) {
			search(searchQuery);
		} else {
			searchResults = [];
		}
	});

	function handleAddressSelect(result: NominatimResult) {
		const newCoords = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
		lnglat = newCoords;
		mapCenter = newCoords; // Move map to selected location
		searchQuery = result.display_name;
		showSearchResults = false;
		searchResults = [];
	}

	function confirmSelection() {
		onchange?.(geohash);
	}

	function handleMapClick(e: { lngLat: LngLat }) {
		if (readonly) return;
		lnglat = { lng: e.lngLat.lng, lat: e.lngLat.lat };
	}
</script>

{#if open}
	<Dialog.Root
		bind:open
		onOpenChange={(isOpen) => {
			if (isOpen) {
				const coords = getCoordsFromHash(geohashProp) ?? defaultCenter;
				lnglat = coords;
				mapCenter = coords;
				// Prevent keyboard from appearing by not focusing the input
				setTimeout(() => {
					if (searchInputRef) {
						searchInputRef.blur();
					}
				}, 0);
			} else {
				searchQuery = '';
				searchResults = [];
				onclose();
			}
		}}
	>
		<Dialog.Content
			class="card-cyberpunk flex max-h-[90vh] max-w-3xl flex-col border-purple-400/20 bg-black/30 backdrop-blur-lg"
		>
			<Dialog.Header class="flex-shrink-0">
				<Dialog.Title class="text-off-white text-2xl font-semibold"
					>{readonly ? 'View Location' : 'Select Location'}</Dialog.Title
				>
				<Dialog.Description class="text-gray-300">
					{readonly
						? 'This is the location associated with the delivery.'
						: 'Search for an address, or drag the marker on the map to select a location.'}
				</Dialog.Description>
			</Dialog.Header>

			{#if !readonly}
				<div class="relative flex-shrink-0 py-4">
					<Input
						type="text"
						placeholder="Search for an address..."
						bind:value={searchQuery}
						onfocus={() => (showSearchResults = true)}
						onblur={() => setTimeout(() => (showSearchResults = false), 150)}
						class="text-off-white border-purple-400/20 bg-black/30 placeholder:text-gray-500 focus:border-cyan-400/40"
						autofocus={false}
						bind:this={searchInputRef}
					/>
					{#if showSearchResults && (searchResults.length > 0 || searchLoading)}
						<div
							role="listbox"
							tabindex="-1"
							class="absolute top-full z-10 mt-1 w-full rounded-md border border-purple-400/20 bg-black/90 shadow-lg backdrop-blur-md"
							onmousedown={(e) => e.preventDefault()}
						>
							<div class="max-h-60 overflow-y-auto p-1">
								{#if searchLoading}
									<div class="flex items-center gap-2 p-2 text-sm text-gray-400">
										<Spinner class="size-4" />
										<span class="text-gray-300">Loading...</span>
									</div>
								{:else}
									{#each searchResults as result (result.place_id)}
										<button
											type="button"
											class="w-full rounded-md p-2 text-left text-sm text-gray-300 transition-colors hover:bg-purple-500/20 hover:text-cyan-300"
											onclick={() => handleAddressSelect(result)}
										>
											{result.display_name}
										</button>
									{/each}
								{/if}
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<div class="relative flex-1 overflow-hidden rounded-md">
				<MapLibre
					style="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
					class="h-full min-h-[300px] rounded-md md:min-h-[400px]"
					zoom={geohashProp ? 13 : 4}
					bind:center={mapCenter}
					onclick={handleMapClick}
					attributionControl={false}
				>
					<NavigationControl />
					<Marker bind:lnglat draggable={!readonly} />
					<FullScreenControl position="top-left" />
				</MapLibre>
				<div
					class="absolute bottom-2 left-2 rounded-md border border-purple-400/20 bg-black/80 px-2 py-1 font-mono text-xs backdrop-blur-md md:text-sm"
				>
					<div class="text-gray-300">
						Lat: <span class="text-cyan-400">{lnglat.lat.toFixed(6)}</span>
					</div>
					<div class="text-gray-300">
						Lng: <span class="text-cyan-400">{lnglat.lng.toFixed(6)}</span>
					</div>
					<div class="font-bold text-purple-300">
						Geohash: <span class="text-cyan-300">{geohash}</span>
					</div>
				</div>
			</div>

			<Dialog.Footer class="flex-shrink-0 gap-3 pt-4">
				<Button
					variant="outline"
					onclick={onclose}
					class="border-purple-400/20 bg-black/20 text-purple-300 hover:border-purple-400/30 hover:bg-purple-400/10"
				>
					{readonly ? 'Close' : 'Cancel'}
				</Button>
				{#if !readonly}
					<Button
						onclick={confirmSelection}
						class="border border-cyan-400/30 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 hover:text-cyan-200"
					>
						Confirm Location
					</Button>
				{/if}
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}
