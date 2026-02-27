<script lang="ts">
	import { MapLibre, NavigationControl } from 'svelte-maplibre-gl';
	import { decodeBase32 } from 'geohashing';
	import type { NostrEvent } from 'nostr-tools';
	import { goto } from '$app/navigation';
	import maplibregl from 'maplibre-gl';
	import type { Coords } from '@/types';
	import { defaultCenter } from '@/constants';

	type DeliveryMarker = {
		id: string;
		title: string;
		amount?: string;
		currency?: string;
		pickup?: Coords;
		dropoff?: Coords;
	};

	let {
		deliveries,
		externalHoveredId
	}: { deliveries: NostrEvent[]; externalHoveredId?: string | null } = $props();

	let hoveredMarker = $state<{
		id: string;
		type: 'pickup' | 'dropoff';
		marker: DeliveryMarker;
		x: number;
		y: number;
	} | null>(null);
	let hoveredDeliveryId = $state<string | null>(null);

	// Watch for external hover changes
	$effect(() => {
		if (externalHoveredId !== undefined) {
			hoveredDeliveryId = externalHoveredId;

			// Update marker opacities based on external hover
			mapMarkers.forEach(({ deliveryId, element }) => {
				if (externalHoveredId === null) {
					element.style.opacity = '1';
				} else if (deliveryId === externalHoveredId) {
					element.style.opacity = '1';
				} else {
					element.style.opacity = '0.2';
				}
			});
		}
	});

	let mapCenter: Coords = $state(defaultCenter);
	let zoom = $state(4);
	let mapInstance = $state<any>(null);
	let mapMarkers: Array<{ marker: maplibregl.Marker; deliveryId: string; element: HTMLElement }> =
		[];

	function getCoordsFromHash(hash: string): Coords | null {
		if (!hash || hash.length < 3) return null;
		try {
			const { lat, lng } = decodeBase32(hash);
			return { lat, lng };
		} catch (e) {
			return null;
		}
	}

	function extractDeliveryMarkers(events: NostrEvent[]): DeliveryMarker[] {
		const result: DeliveryMarker[] = [];

		for (const event of events) {
			const pickupTag = event.tags.find((t) => t[0] === 'pickup_geohash');
			const dropoffTag = event.tags.find((t) => t[0] === 'dropoff_geohash');
			const titleTag = event.tags.find((t) => t[0] === 'd');
			const amountTag = event.tags.find((t) => t[0] === 'amount');

			const pickup = pickupTag?.[1] ? getCoordsFromHash(pickupTag[1]) : null;
			const dropoff = dropoffTag?.[1] ? getCoordsFromHash(dropoffTag[1]) : null;

			if (!pickup && !dropoff) continue;

			result.push({
				id: event.id,
				title: titleTag?.[1] || 'Untitled',
				amount: amountTag?.[1],
				currency: amountTag?.[2] || 'SATS',
				pickup: pickup ?? undefined,
				dropoff: dropoff ?? undefined
			});
		}

		return result;
	}

	function handleMarkerClick(deliveryId: string) {
		goto(`/deliveries/${deliveryId}`);
	}

	function handleMarkerMouseEnter(
		e: MouseEvent,
		marker: DeliveryMarker,
		type: 'pickup' | 'dropoff'
	) {
		hoveredMarker = {
			id: marker.id,
			type,
			marker,
			x: e.clientX,
			y: e.clientY
		};
		hoveredDeliveryId = marker.id;

		// Fade all markers except those belonging to this delivery
		mapMarkers.forEach(({ deliveryId, element }) => {
			if (deliveryId === marker.id) {
				element.style.opacity = '1';
			} else {
				element.style.opacity = '0.2';
			}
		});
	}

	function handleMarkerMouseMove(e: MouseEvent) {
		if (hoveredMarker) {
			hoveredMarker = {
				...hoveredMarker,
				x: e.clientX,
				y: e.clientY
			};
		}
	}

	function handleMarkerMouseLeave() {
		hoveredMarker = null;
		hoveredDeliveryId = null;

		// Reset all markers to full opacity
		mapMarkers.forEach(({ element }) => {
			element.style.opacity = '1';
		});
	}

	const markers = $derived(extractDeliveryMarkers(deliveries));

	// Fit bounds dynamically using MapLibre's fitBounds API
	function fitBounds() {
		if (!mapInstance) return;

		if (markers.length === 0) {
			mapCenter = defaultCenter;
			zoom = 4;
			return;
		}

		const allCoords: Coords[] = [];
		markers.forEach((m) => {
			if (m.pickup) allCoords.push(m.pickup);
			if (m.dropoff) allCoords.push(m.dropoff);
		});

		if (allCoords.length === 0) return;

		// Calculate bounds
		const lngs = allCoords.map((c) => c.lng);
		const lats = allCoords.map((c) => c.lat);

		const minLng = Math.min(...lngs);
		const maxLng = Math.max(...lngs);
		const minLat = Math.min(...lats);
		const maxLat = Math.max(...lats);

		const bounds: [[number, number], [number, number]] = [
			[minLng, minLat], // Southwest
			[maxLng, maxLat] // Northeast
		];

		// Use fitBounds with generous padding to ensure all markers are visible
		mapInstance.fitBounds(bounds, {
			padding: { top: 80, bottom: 80, left: 80, right: 80 },
			duration: 1000,
			maxZoom: 12
		});
	}

	// Fit bounds when map is ready or markers change
	$effect(() => {
		if (!mapInstance) return;
		deliveries;
		// Small delay to ensure map is fully initialized
		setTimeout(() => fitBounds(), 100);
	});

	// Helper function to calculate pixel offset for overlapping markers
	function getPixelOffset(index: number, total: number): [number, number] {
		if (total === 1) return [0, 0];

		// Small offset distance in pixels - just enough to be clickable but clearly grouped
		const offsetDistance = 12; // pixels - markers appear right next to each other

		// Arrange markers in a circle around the original point
		const angle = (2 * Math.PI * index) / total;
		const offsetX = Math.cos(angle) * offsetDistance;
		const offsetY = Math.sin(angle) * offsetDistance;

		return [offsetX, offsetY];
	}

	// Helper function to create a location key for grouping
	function getLocationKey(coords: Coords): string {
		// Round to 4 decimal places (~11 meters precision)
		return `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`;
	}

	// Group markers by location to detect overlaps
	type MarkerData = {
		marker: DeliveryMarker;
		type: 'pickup' | 'dropoff';
		coords: Coords;
	};

	function groupMarkersByLocation(markers: DeliveryMarker[]): Map<string, MarkerData[]> {
		const locationGroups = new Map<string, MarkerData[]>();

		markers.forEach((marker) => {
			if (marker.pickup) {
				const key = getLocationKey(marker.pickup);
				const existing = locationGroups.get(key) || [];
				existing.push({ marker, type: 'pickup', coords: marker.pickup });
				locationGroups.set(key, existing);
			}

			if (marker.dropoff) {
				const key = getLocationKey(marker.dropoff);
				const existing = locationGroups.get(key) || [];
				existing.push({ marker, type: 'dropoff', coords: marker.dropoff });
				locationGroups.set(key, existing);
			}
		});

		return locationGroups;
	}

	// Create markers when map is ready and markers data changes
	$effect(() => {
		if (!mapInstance || markers.length === 0) return;

		// Clear existing markers
		mapMarkers.forEach(({ marker }) => marker.remove());
		mapMarkers = [];

		// Group markers by location to detect overlaps
		const locationGroups = groupMarkersByLocation(markers);

		// Create markers with offsets for overlapping locations
		locationGroups.forEach((group, locationKey) => {
			group.forEach((markerData, index) => {
				const { marker, type, coords } = markerData;

				// Calculate pixel offset for multiple markers at same location
				const [offsetX, offsetY] = getPixelOffset(index, group.length);

				const el = document.createElement('div');
				el.className = 'marker-wrapper';
				el.style.cssText =
					'width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: opacity 0.2s ease;';

				const button = document.createElement('div');
				const isPickup = type === 'pickup';
				const bgColor = isPickup ? 'bg-cyan-500' : 'bg-purple-500';
				const label = isPickup ? 'P' : 'D';

				button.className = `w-10 h-10 rounded-full ${bgColor} border-2 border-white shadow-lg flex items-center justify-center transition-all duration-200`;
				button.innerHTML = `<span class="text-white text-sm font-bold select-none">${label}</span>`;
				button.style.cssText =
					'display: flex; align-items: center; justify-content: center; pointer-events: none;';

				el.appendChild(button);

				let mouseDownTime = 0;
				let mouseDownPos = { x: 0, y: 0 };

				el.addEventListener('mouseenter', (e) => {
					button.style.transform = 'scale(1.1)';
					handleMarkerMouseEnter(e as MouseEvent, marker, type);
				});

				el.addEventListener('mousemove', (e) => {
					handleMarkerMouseMove(e as MouseEvent);
				});

				el.addEventListener('mouseleave', () => {
					button.style.transform = 'scale(1)';
					handleMarkerMouseLeave();
				});

				el.addEventListener('mousedown', (e) => {
					mouseDownTime = Date.now();
					mouseDownPos = { x: e.clientX, y: e.clientY };
				});

				el.addEventListener('click', (e) => {
					const timeDiff = Date.now() - mouseDownTime;
					const dx = Math.abs(e.clientX - mouseDownPos.x);
					const dy = Math.abs(e.clientY - mouseDownPos.y);

					// Only treat as click if it was quick and didn't move much
					if (timeDiff < 300 && dx < 5 && dy < 5) {
						e.stopPropagation();
						handleMarkerClick(marker.id);
					}
				});

				// Use pixel offset for consistent spacing at all zoom levels
				const mapMarker = new maplibregl.Marker({
					element: el,
					anchor: 'center',
					offset: [offsetX, offsetY]
				})
					.setLngLat([coords.lng, coords.lat])
					.addTo(mapInstance);

				mapMarkers.push({ marker: mapMarker, deliveryId: marker.id, element: el });
			});
		});

		return () => {
			// Cleanup markers
			mapMarkers.forEach(({ marker }) => marker.remove());
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

	<!-- Hover Popover -->
	{#if hoveredMarker}
		<div
			class="pointer-events-none fixed z-[9999] transition-all duration-100"
			style="left: {hoveredMarker.x + 15}px; top: {hoveredMarker.y - 50}px;"
		>
			<div class="card-cyberpunk-cyan px-3 py-2 whitespace-nowrap shadow-xl">
				<p class="text-off-white mb-1 text-sm font-semibold">{hoveredMarker.marker.title}</p>
				{#if hoveredMarker.marker.amount}
					<p class="text-xs text-cyan-300">
						<span class="font-bold">{hoveredMarker.marker.amount}</span>
						{hoveredMarker.marker.currency || 'SATS'}
					</p>
				{:else}
					<p class="text-xs text-gray-400">Amount not specified</p>
				{/if}
				<p class="mt-1 text-xs text-gray-400">
					{hoveredMarker.type === 'pickup' ? '📍 Pickup' : '🎯 Dropoff'}
				</p>
			</div>
		</div>
	{/if}

	{#if markers.length === 0}
		<div
			class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm"
		>
			<div class="card-cyberpunk p-6">
				<p class="text-gray-300">No delivery locations to display</p>
			</div>
		</div>
	{/if}
</div>
