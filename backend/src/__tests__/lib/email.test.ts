// NODE_ENV=test (setup.ts) → lib/email utilise le jsonTransport de nodemailer :
// aucun email réel n'est envoyé, mais le chemin sendMail complet est exercé.
import { sendVerificationEmail, sendPasswordResetEmail } from '../../lib/email';

describe('lib/email', () => {
  it('sends the verification email without throwing', async () => {
    await expect(sendVerificationEmail('test@example.com', 'sometoken')).resolves.toBeUndefined();
  });

  it('sends the password reset email without throwing', async () => {
    await expect(sendPasswordResetEmail('test@example.com', 'sometoken')).resolves.toBeUndefined();
  });
});
