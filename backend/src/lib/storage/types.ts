/** Fichier entrant à stocker (issu de multer, en mémoire). */
export interface UploadFile {
  buffer: Buffer;
  mimetype: string;
  originalName: string;
}

/** Résultat d'un stockage : URL publique + clé interne (pour la suppression). */
export interface StoredFile {
  url: string;
  key: string;
}

/**
 * Abstraction du stockage de fichiers — permet de remplacer le disque local par
 * un fournisseur cloud (Cloudinary, S3…) sans toucher aux services/routes,
 * dans la même logique d'abstraction que les couches carte et temps réel.
 */
export interface StorageProvider {
  save(file: UploadFile): Promise<StoredFile>;
  /** Suppression best-effort à partir de l'URL publique (ne lève pas si absent). */
  delete(url: string): Promise<void>;
}
