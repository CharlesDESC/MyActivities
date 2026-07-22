import { config } from '../../config';
import { EmailMessage, EmailProvider } from './types';

// API HTTP transactionnelle de Brevo (alternative au relais SMTP) :
// https://developers.brevo.com/reference/sendtransacemail
export class BrevoApiEmailProvider implements EmailProvider {
  readonly name = 'brevo-api';

  isConfigured(): boolean {
    return Boolean(config.brevoApiKey);
  }

  async send({ to, subject, html }: EmailMessage): Promise<void> {
    // Réutilise SMTP_FROM (« Nom <adresse> ») pour l'expéditeur
    const match = config.smtp.from.match(/^(.*)<(.+)>$/);
    const sender = match
      ? { name: match[1].trim(), email: match[2].trim() }
      : { email: config.smtp.from };

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': config.brevoApiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ sender, to: [{ email: to }], subject, htmlContent: html }),
    });

    if (!res.ok) {
      throw new Error(`Brevo API ${res.status} : ${await res.text()}`);
    }
  }
}
