<script lang="ts">
	import { MapLibre, NavigationControl } from 'svelte-maplibre-gl';
	import { decodeBase32 } from 'geohashing';
	import type { NostrEvent } from 'nostr-tools';
	import maplibregl from 'maplibre-gl';
	import type { Coords } from '@/types';
	import { defaultCenter } from '@/constants';

	let { delivery }: { delivery: NostrEvent } = $props();

	let mapCenter: Coords = $state(defaultCenter);
	let zoom = $state(12);
	let mapInstance = $state<any>(null);
	let mapMarkers: maplibregl.Marker[] = [];

	function getCoordsFromHash(hash: string): Coords | null {
		if (!hash || hash.length < 3) return null;
		try {
			const { lat, lng } = decodeBase32(hash);
			return { lat, lng };
		} catch (e) {
			return null;
		}
	}

	function extractCoordinates() {
		const pickupTag = delivery.tags.find((t) => t[0] === 'pickup_geohash');
		const dropoffTag = delivery.tags.find((t) => t[0] === 'dropoff_geohash');

		const pickup = pickupTag?.[1] ? getCoordsFromHash(pickupTag[1]) : null;
		const dropoff = dropoffTag?.[1] ? getCoordsFromHash(dropoffTag[1]) : null;

		return { pickup, dropoff };
	}

	// Center map on markers when they're added (but don't auto-resize on scroll)
	function centerMapOnMarkers() {
		if (!mapInstance) return;

		const { pickup, dropoff } = extractCoordinates();

		if (!pickup && !dropoff) {
			mapCenter = defaultCenter;
			zoom = 4;
			return;
		}

		const coords: Coords[] = [];
		if (pickup) coords.push(pickup);
		if (dropoff) coords.push(dropoff);

		if (coords.length === 1) {
			// Only one marker, center on it
			mapInstance.flyTo({
				center: [coords[0].lng, coords[0].lat],
				zoom: 12,
				duration: 1000
			});
		} else if (coords.length === 2) {
			// Two markers - use fitBounds for dynamic zoom calculation
			const lngs = coords.map((c) => c.lng);
			const lats = coords.map((c) => c.lat);

			const bounds: [[number, number], [number, number]] = [
				[Math.min(...lngs), Math.min(...lats)], // Southwest
				[Math.max(...lngs), Math.max(...lats)] // Northeast
			];

			// Use fitBounds with generous padding to ensure both markers are visible
			mapInstance.fitBounds(bounds, {
				padding: { top: 80, bottom: 80, left: 80, right: 80 },
				duration: 1000,
				maxZoom: 12
			});
		}
	}

	// Create markers when map is ready
	$effect(() => {
		if (!mapInstance) return;
		delivery; // Make reactive to delivery changes

		const { pickup, dropoff } = extractCoordinates();

		// Clear existing markers
		mapMarkers.forEach((m) => m.remove());
		mapMarkers = [];

		// Create pickup marker
		if (pickup) {
			const el = document.createElement('div');
			el.className = 'marker-wrapper';
			el.style.cssText =
				'width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;';

			const button = document.createElement('div');
			button.className =
				'w-10 h-10 rounded-full bg-cyan-500 border-2 border-white shadow-lg flex items-center justify-center';
			button.innerHTML = '<span class="text-white text-sm font-bold select-none">P</span>';
			button.style.cssText = 'display: flex; align-items: center; justify-content: center;';

			el.appendChild(button);

			const marker = new maplibregl.Marker({
				element: el,
				anchor: 'center'
			})
				.setLngLat([pickup.lng, pickup.lat])
				.addTo(mapInstance);

			mapMarkers.push(marker);
		}

		// Create dropoff marker
		if (dropoff) {
			const el = document.createElement('div');
			el.className = 'marker-wrapper';
			el.style.cssText =
				'width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;';

			const button = document.createElement('div');
			button.className =
				'w-10 h-10 rounded-full bg-purple-500 border-2 border-white shadow-lg flex items-center justify-center';
			button.innerHTML = '<span class="text-white text-sm font-bold select-none">D</span>';
			button.style.cssText = 'display: flex; align-items: center; justify-content: center;';

			el.appendChild(button);

			const marker = new maplibregl.Marker({
				element: el,
				anchor: 'center'
			})
				.setLngLat([dropoff.lng, dropoff.lat])
				.addTo(mapInstance);

			mapMarkers.push(marker);
		}

		// Center map on the markers after they're created
		setTimeout(() => centerMapOnMarkers(), 100);

		return () => {
			mapMarkers.forEach((m) => m.remove());
			mapMarkers = [];
		};
	});
</script>

<div class="relative h-full w-full">
	<MapLibre
		style="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
		class="h-full w-full"
		bind:zoom
		bind:center={mapCenter}
		bind:map={mapInstance}
		attributionControl={false}
	>
		<NavigationControl />
	</MapLibre>

	{#if !extractCoordinates().pickup && !extractCoordinates().dropoff}
		<div
			class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm"
		>
			<div class="card-cyberpunk p-6">
				<p class="text-gray-300">No location data available</p>
			</div>
		</div>
	{/if}
</div>
