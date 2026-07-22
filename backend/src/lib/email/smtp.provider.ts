import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../../config';
import { EmailMessage, EmailProvider } from './types';

// SMTP générique (Brevo relay, Ethereal, Mailjet…) : seul le .env change.
export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp';
  private readonly transporter: Transporter;

  constructor() {
    this.transporter =
      config.nodeEnv === 'test'
        ? nodemailer.createTransport({ jsonTransport: true })
        : nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.secure,
            auth: { user: config.smtp.user, pass: config.smtp.pass },
          });
  }

  isConfigured(): boolean {
    return config.nodeEnv === 'test' || Boolean(config.smtp.host);
  }

  async send({ to, subject, html }: EmailMessage): Promise<void> {
    await this.transporter.sendMail({ from: config.smtp.from, to, subject, html });
  }
}
