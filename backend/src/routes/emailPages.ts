import { Router, Request, Response } from 'express';
import express from 'express';
import { ResetPasswordSchema } from '../schemas/auth';
import { AppError } from '../middleware/errorHandler';
import * as authService from '../services/auth.service';

// Pages HTML ciblées par les liens des emails (vérification + reset).
// Sans JavaScript : la CSP de helmet bloque les scripts inline.
const router = Router();

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — MyActivities</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f5f5f5; display: flex; justify-content: center; padding: 3rem 1rem; }
    .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.08); padding: 2rem; max-width: 26rem; width: 100%; }
    h1 { font-size: 1.25rem; margin-top: 0; }
    p { color: #444; line-height: 1.5; }
    label { display: block; margin: 1rem 0 .25rem; font-weight: 600; font-size: .9rem; }
    input { width: 100%; padding: .6rem; border: 1px solid #ccc; border-radius: 8px; box-sizing: border-box; }
    button { margin-top: 1.25rem; width: 100%; padding: .7rem; border: 0; border-radius: 8px; background: #2563eb; color: #fff; font-size: 1rem; cursor: pointer; }
    .error { color: #b91c1c; }
    .success { color: #15803d; }
    .hint { font-size: .8rem; color: #777; }
  </style>
</head>
<body><div class="card">${body}</div></body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

router.get('/verify-email', async (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) {
    res.status(400).send(page('Lien invalide', '<h1 class="error">Lien invalide</h1><p>Le lien de vérification est incomplet. Utilisez le lien reçu par email.</p>'));
    return;
  }
  try {
    await authService.verifyEmail(token);
    res.send(page('Email vérifié', '<h1 class="success">Email vérifié ✅</h1><p>Votre compte est activé. Vous pouvez maintenant vous connecter dans l’application MyActivities.</p>'));
  } catch (err) {
    const message = err instanceof AppError ? err.message : 'Une erreur est survenue. Réessayez plus tard.';
    const status = err instanceof AppError ? err.statusCode : 500;
    res.status(status).send(page('Vérification impossible', `<h1 class="error">Vérification impossible</h1><p>${escapeHtml(message)}</p>`));
  }
});

function resetForm(token: string, error?: string): string {
  return `
    <h1>Réinitialiser le mot de passe</h1>
    ${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}
    <form method="post" action="reset-password">
      <input type="hidden" name="token" value="${escapeHtml(token)}">
      <label for="password">Nouveau mot de passe</label>
      <input type="password" id="password" name="password" required minlength="8" autocomplete="new-password">
      <p class="hint">8 caractères minimum, avec au moins 1 majuscule et 1 chiffre.</p>
      <button type="submit">Valider</button>
    </form>`;
}

router.get('/reset-password', (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) {
    res.status(400).send(page('Lien invalide', '<h1 class="error">Lien invalide</h1><p>Le lien de réinitialisation est incomplet. Utilisez le lien reçu par email.</p>'));
    return;
  }
  res.send(page('Réinitialiser le mot de passe', resetForm(token)));
});

router.post('/reset-password', express.urlencoded({ extended: false }), async (req: Request, res: Response) => {
  const parsed = ResetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    res.status(400).send(page(
      'Réinitialiser le mot de passe',
      resetForm(token, 'Mot de passe invalide : 8 caractères minimum, avec au moins 1 majuscule et 1 chiffre.'),
    ));
    return;
  }
  try {
    await authService.resetPassword(parsed.data.token, parsed.data.password);
    res.send(page('Mot de passe mis à jour', '<h1 class="success">Mot de passe mis à jour ✅</h1><p>Vous pouvez maintenant vous connecter dans l’application MyActivities avec votre nouveau mot de passe.</p>'));
  } catch (err) {
    const message = err instanceof AppError ? err.message : 'Une erreur est survenue. Réessayez plus tard.';
    const status = err instanceof AppError ? err.statusCode : 500;
    res.status(status).send(page('Réinitialisation impossible', `<h1 class="error">Réinitialisation impossible</h1><p>${escapeHtml(message)}</p><p>Vous pouvez redemander un lien depuis l’application.</p>`));
  }
});

export default router;
