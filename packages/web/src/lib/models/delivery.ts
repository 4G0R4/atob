import type { Event } from 'nostr-tools';
import type { Model } from 'applesauce-core';
import { map } from 'rxjs/operators';
import { type createAtobMachineDefinition } from '@atob/lib';

export interface Delivery {
	id: string;
	title: string;
	description: string;
	amount: number;
	currency?: string;
	pickup_geohash: string;
	dropoff_geohash: string;
	creator: string;
	receiver: string;
	created_at: number;
	state: string;
	rawEvent: Event;
	sm_pub?: string; // If sm_pub is defined means this is an encrypted delivery
}

export function parseDeliveryEvent(event: Event): Delivery | undefined {
	try {
		const title = event.tags.find((t) => t[0] === 'title')?.[1];
		const description = event.tags.find((t) => t[0] === 'description')?.[1];
		const amountTag = event.tags.find((t) => t[0] === 'amount');
		const amount = amountTag?.[1];
		const currency = amountTag?.[2] || 'SATS'; // Default to SATS if no currency specified
		const pickup_geohash = event.tags.find((t) => t[0] === 'pickup_geohash')?.[1];
		const dropoff_geohash = event.tags.find((t) => t[0] === 'dropoff_geohash')?.[1];
		const state = event.tags.find((t) => t[0] === 'state')?.[1];
		const machineDefinition: ReturnType<typeof createAtobMachineDefinition> = JSON.parse(
			event.content
		);
		const receiver = machineDefinition.context.receiverPubKey;
		let sm_pub: string | undefined = undefined;
		if ('sm_pub' in event) {
			sm_pub = event.sm_pub as string;
		}

		if (
			!title ||
			!description ||
			!amount ||
			!pickup_geohash ||
			!dropoff_geohash ||
			!receiver ||
			!state
		) {
			return undefined;
		}

		return {
			id: event.id,
			title,
			description: description,
			amount: parseInt(amount),
			currency,
			pickup_geohash,
			dropoff_geohash,
			creator: event.pubkey,
			receiver,
			created_at: event.created_at,
			state,
			rawEvent: event,
			sm_pub
		};
	} catch (e) {
		console.error('Failed to parse delivery event', e);
		return undefined;
	}
}

/** A model that gets and parses a delivery event */
export function DeliveryModel(id: string): Model<Delivery | undefined> {
	return (eventStore) =>
		eventStore.event(id).pipe(map((event) => (event ? parseDeliveryEvent(event) : undefined)));
}
