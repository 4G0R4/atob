import type { Event } from 'nostr-tools';

export interface StateSnapshot {
	status: string;
	value: string;
	context: {
		creatorPubKey: string;
		executorPubKey: string;
		receiverPubKey: string;
		inputterPubKey: string | null;
	};
	children: object;
	historyValue: object;
}

export interface ParsedTransitionEvent {
	raw: Event;
	type: string;
	participantRole?: 'Creator' | 'Executor' | 'Receiver' | 'Inputter';
}

export type Coords = { lng: number; lat: number };
