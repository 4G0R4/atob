import type { Event } from 'nostr-tools';
import type { Model } from 'applesauce-core';
import { map } from 'rxjs/operators';

export interface PublicOffer {
	id: string;
	title?: string;
	description?: string;
	amount?: number;
	currency?: string;
	pickup_geohash?: string;
	dropoff_geohash?: string;
	creator: string;
	created_at: number;
	rawEvent: Event;

	// New/extended fields from spec
	comms?: Array<string[]>;
	roles?: string[];
	engines?: Array<{ name: string; params?: string[] }>;
	deadline?: number;
	// If the event content contains a stringified state machine preview, keep the raw string
	content?: string;
	// Optionally parsed preview (if content is valid JSON)
	contentPreview?: unknown;
}

function parsePublicOfferEvent(event: Event): PublicOffer | undefined {
	try {
		// Basic, single-value tags
		const title = event.tags.find((t) => t[0] === 'title')?.[1];
		const description = event.tags.find((t) => t[0] === 'description')?.[1];

		// Amount tag may include currency as third element
		const amountTag = event.tags.find((t) => t[0] === 'amount');
		const amountStr = amountTag?.[1];
		const currency = amountTag?.[2] || 'SATS';

		const pickup_geohash = event.tags.find((t) => t[0] === 'pickup_geohash')?.[1];
		const dropoff_geohash = event.tags.find((t) => t[0] === 'dropoff_geohash')?.[1];

		// Extended tags: comm, role, engine, deadline
		const comms: Array<string[]> = [];
		const roles: string[] = [];
		const engines: Array<{ name: string; params?: string[] }> = [];
		let deadline: number | undefined;

		for (const t of event.tags) {
			if (!Array.isArray(t) || t.length === 0) continue;
			const key = t[0];
			switch (key) {
				case 'comm': {
					if (t.length > 1) {
						comms.push(t);
					}
					break;
				}
				case 'role': {
					// Example: ["role", "executor"]
					if (t[1]) roles.push(t[1]);
					break;
				}
				case 'engine': {
					// Example: ["engine", "xstate@5", "state-machine"]
					if (t[1]) engines.push({ name: t[1], params: t.slice(2) || undefined });
					break;
				}
				case 'deadline': {
					// Example: ["deadline", "1700000000"]
					const d = t[1] ? parseInt(t[1], 10) : undefined;
					if (!Number.isNaN(d)) deadline = d;
					break;
				}
				// ignore other tags here since they're handled above or not needed
			}
		}

		// Try to parse content as JSON preview if present
		let contentPreview: unknown = undefined;
		const contentRaw = event.content || '';
		if (contentRaw && contentRaw.trim().length > 0) {
			try {
				contentPreview = JSON.parse(contentRaw);
			} catch (e) {
				// Not a JSON preview, keep content raw
				contentPreview = undefined;
			}
		}

		return {
			id: event.id,
			title,
			description,
			amount: amountStr ? parseInt(amountStr, 10) : undefined,
			currency,
			pickup_geohash,
			dropoff_geohash,
			creator: event.pubkey,
			created_at: event.created_at,
			rawEvent: event,
			comms: comms.length ? comms : undefined,
			roles: roles.length ? roles : undefined,
			engines: engines.length ? engines : undefined,
			deadline,
			content: contentRaw || undefined,
			contentPreview
		};
	} catch (e) {
		console.error('Failed to parse public offer event', e);
		return undefined;
	}
}

/** A model that gets and parses a public offer event */
export function PublicOfferModel(id: string): Model<PublicOffer | undefined> {
	return (eventStore) =>
		eventStore.event(id).pipe(map((event) => (event ? parsePublicOfferEvent(event) : undefined)));
}
