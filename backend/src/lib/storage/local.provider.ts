import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../../config';
import { StorageProvider, UploadFile, StoredFile } from './types';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/**
 * Stockage sur disque local. Les fichiers sont servis en statique sous
 * `config.storage.publicPath` (voir app.ts). Adapté au dev / MVP ; sur un hébergement
 * à système de fichiers éphémère (ex. Render free), préférer un adaptateur cloud.
 */
export class LocalStorageProvider implements StorageProvider {
  constructor(
    private readonly uploadDir: string = config.storage.uploadDir,
    private readonly publicBase: string = `${config.appUrl}${config.storage.publicPath}`,
  ) {}

  async save(file: UploadFile): Promise<StoredFile> {
    await fs.mkdir(this.uploadDir, { recursive: true });
    const ext = EXT_BY_MIME[file.mimetype] ?? '.bin';
    const key = `${crypto.randomUUID()}${ext}`;
    await fs.writeFile(path.join(this.uploadDir, key), file.buffer);
    return { url: `${this.publicBase}/${key}`, key };
  }

  async delete(url: string): Promise<void> {
    const key = url.split('/').pop();
    if (!key) return;
    try {
      await fs.unlink(path.join(this.uploadDir, key));
    } catch {
      // best-effort : fichier déjà absent → on ignore
    }
  }
}
