import type { EventTemplate, NostrEvent } from "nostr-tools";

/**
 * A generic interface for Nostr signers.
 */
export interface NostrSigner {
  getPublicKey(): Promise<string>;
  signEvent(event: EventTemplate): Promise<NostrEvent>;

  // Optional NIP-04 encryption support (deprecated)
  nip04?: {
    encrypt: (pubkey: string, plaintext: string) => Promise<string>;
    decrypt: (pubkey: string, ciphertext: string) => Promise<string>;
  };

  // Optional NIP-44 encryption support
  nip44?: {
    encrypt: (pubkey: string, plaintext: string) => Promise<string>;
    decrypt: (pubkey: string, ciphertext: string) => Promise<string>;
  };
}
