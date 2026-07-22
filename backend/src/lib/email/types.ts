export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

// Pattern adaptateur : chaque fournisseur d'envoi implémente ce contrat.
// Changer de fournisseur = changer EMAIL_PROVIDER, sans toucher au reste du code.
export interface EmailProvider {
  readonly name: string;
  /** false tant que les identifiants ne sont pas renseignés (l'envoi est alors sauté en dev) */
  isConfigured(): boolean;
  send(message: EmailMessage): Promise<void>;
}
