import { config } from '../../config';
import { EmailMessage, EmailProvider } from './types';
import { SmtpEmailProvider } from './smtp.provider';
import { BrevoApiEmailProvider } from './brevo-api.provider';

// Pattern adaptateur : le reste du code n'appelle que sendVerificationEmail /
// sendPasswordResetEmail. Le fournisseur réel est choisi via EMAIL_PROVIDER
// (smtp | brevo-api) — en changer ne demande aucune modification de code.
function createProvider(): EmailProvider {
  switch (config.emailProvider) {
    case 'brevo-api':
      return new BrevoApiEmailProvider();
    case 'smtp':
    default:
      return new SmtpEmailProvider();
  }
}

const provider = createProvider();
const APP_URL = config.appUrl;

async function deliver(message: EmailMessage, devLink: string): Promise<void> {
  if (config.nodeEnv === 'development') {
    console.log(`[DEV] ${devLink}`);
    // Sans fournisseur configuré, on s'arrête au log ; sinon on envoie aussi le vrai mail
    if (!provider.isConfigured()) return;
  }
  await provider.send(message);
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const link = `${APP_URL}/verify-email?token=${token}`;
  await deliver(
    {
      to: email,
      subject: 'Vérifiez votre adresse email — MyActivities',
      html: `
      <p>Bonjour,</p>
      <p>Cliquez sur le lien ci-dessous pour vérifier votre adresse email :</p>
      <p><a href="${link}">Vérifier mon email</a></p>
      <p>Ce lien expire dans 24 heures.</p>
    `,
    },
    `Verification link: ${link}`,
  );
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const link = `${APP_URL}/reset-password?token=${token}`;
  await deliver(
    {
      to: email,
      subject: 'Réinitialisation de mot de passe — MyActivities',
      html: `
      <p>Bonjour,</p>
      <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
      <p><a href="${link}">Réinitialiser mon mot de passe</a></p>
      <p>Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    `,
    },
    `Password reset link: ${link}`,
  );
}
