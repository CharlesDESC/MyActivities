import { config } from '../../config';
import { StorageProvider } from './types';
import { LocalStorageProvider } from './local.provider';

let provider: StorageProvider | null = null;

/**
 * Renvoie le fournisseur de stockage actif (singleton), choisi via `config.storage.driver`.
 * Pour ajouter un fournisseur cloud : implémenter `StorageProvider` et le référencer ici.
 */
export function getStorageProvider(): StorageProvider {
  if (!provider) {
    switch (config.storage.driver) {
      case 'local':
      default:
        provider = new LocalStorageProvider();
    }
  }
  return provider;
}

/** Réinitialise le singleton — usage tests uniquement. */
export function __resetStorageProvider(): void {
  provider = null;
}

export type { StorageProvider, UploadFile, StoredFile } from './types';
