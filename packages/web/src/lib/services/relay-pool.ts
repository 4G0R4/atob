import { RelayPool } from 'applesauce-relay';

// Create a single relay pool instance for the entire application
export const relayPool = new RelayPool();

// // Add debugging to relay pool
// relayPool.add$.subscribe((relay) => {
// 	console.log('Relay added:', relay.url);
// });

// relayPool.remove$.subscribe((relay) => {
// 	console.log('Relay removed:', relay.url);
// });

// Monitor relay connections
relayPool.relays$.subscribe((relays) => {
	relays.forEach((relay, url) => {
		// relay.connected$.subscribe((connected) => {
		// 	console.log(`Relay ${url} connected:`, connected);
		// });
		relay.error$.subscribe((error) => {
			if (error) {
				console.error(`Relay ${url} error:`, error);
			}
		});
	});
});

// Determine relay URL based on environment
const isProduction =
	typeof window !== 'undefined' && window.location.hostname === 'app.atobitcoin.io';

// In dev, connect directly to nak relay
// In production, use proxied relay through Apache
const localRelayUrl = isProduction ? 'wss://app.atobitcoin.io/relay' : 'ws://localhost:10547';

export const defaultRelays = [localRelayUrl];

export const commonRelays = [
	'wss://relay.damus.io',
	'wss://relay.nostr.net',
	'wss://nos.lol',
	'wss://nostr.mom'
];

// Always use public relays for metadata lookups (user profiles)
export const metadataRelays = ['wss://0.kindpag.es/', 'wss://nos.lol', 'wss://relay.damus.io'];

export const devRelay = [localRelayUrl];
