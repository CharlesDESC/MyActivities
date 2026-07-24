import { pool } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import { hashPassword, verifyPassword } from '../lib/password';
import { generateAccessToken, generateOpaqueToken, hashToken } from '../lib/tokens';
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/email';
import { config } from '../config';
import { UserRow, SafeUser, LoginResult, TokenPair, RefreshTokenRow } from '../types';

async function checkBruteForce(identifier: string): Promise<void> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text FROM login_attempts
     WHERE identifier = $1 AND succeeded = false
       AND attempted_at > NOW() - INTERVAL '15 minutes'`,
    [identifier],
  );
  if (parseInt(rows[0].count, 10) >= config.auth.rateLimitMax) {
    throw new AppError(429, 'Compte temporairement bloqué. Réessayez dans 15 minutes.', 'RATE_LIMITED');
  }
}

async function recordFailedAttempt(identifier: string, ip: string): Promise<void> {
  await pool.query(
    'INSERT INTO login_attempts (identifier, ip_address, succeeded) VALUES ($1, $2, false)',
    [identifier, ip],
  );
}

async function markAttemptSuccess(identifier: string, ip: string): Promise<void> {
  await pool.query(
    `WITH cleared_failures AS (
       DELETE FROM login_attempts WHERE identifier = $1 AND succeeded = false
     )
     INSERT INTO login_attempts (identifier, ip_address, succeeded) VALUES ($1, $2, true)`,
    [identifier, ip],
  );
}

export async function register(
  email: string,
  pseudo: string,
  password: string,
  siret?: string,
): Promise<{ user: SafeUser; verificationToken: string }> {
  const existing = await pool.query<{ email: string; pseudo: string }>(
    'SELECT email, pseudo FROM users WHERE email = $1 OR pseudo = $2',
    [email, pseudo],
  );
  if (existing.rowCount && existing.rowCount > 0) {
    if (existing.rows.some((r) => r.email === email)) {
      throw new AppError(409, 'Un compte avec cet email existe déjà.', 'EMAIL_ALREADY_EXISTS');
    }
    throw new AppError(409, 'Ce pseudo est déjà utilisé.', 'PSEUDO_ALREADY_EXISTS');
  }

  const password_hash = await hashPassword(password);
  // Un SIRET fourni (parcours organisateur web) crée directement un compte organizer.
  const role = siret ? 'organizer' : 'member';
  const { rows } = await pool.query<SafeUser>(
    `INSERT INTO users (email, pseudo, password_hash, role, siret)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, pseudo, role, status, siret,
               avatar_url AS "avatarUrl", email_verified AS "emailVerified", created_at AS "createdAt"`,
    [email, pseudo, password_hash, role, siret ?? null],
  );

  const rawToken = generateOpaqueToken();
  await pool.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
    [rows[0].id, hashToken(rawToken)],
  );

  // Le compte est déjà créé : un échec SMTP ne doit pas faire échouer l'inscription
  try {
    await sendVerificationEmail(email, rawToken);
  } catch (err) {
    console.error('Envoi de l\'email de vérification échoué :', err);
  }
  return { user: rows[0], verificationToken: rawToken };
}

export async function login(
  pseudo: string,
  password: string,
  ip: string,
  rememberMe = false,
): Promise<LoginResult> {
  await checkBruteForce(pseudo);

  const { rows } = await pool.query<SafeUser & Pick<UserRow, 'password_hash' | 'suspended_until'>>(
    `SELECT id, email, pseudo, role, status, siret,
            avatar_url AS "avatarUrl", email_verified AS "emailVerified", created_at AS "createdAt",
            password_hash, suspended_until
     FROM users WHERE pseudo = $1 AND deleted_at IS NULL`,
    [pseudo],
  );

  if (rows.length === 0) {
    await recordFailedAttempt(pseudo, ip);
    throw new AppError(401, 'Pseudo ou mot de passe incorrect.', 'INVALID_CREDENTIALS');
  }

  if (!(await verifyPassword(password, rows[0].password_hash))) {
    await recordFailedAttempt(pseudo, ip);
    throw new AppError(401, 'Pseudo ou mot de passe incorrect.', 'INVALID_CREDENTIALS');
  }

  const user = rows[0];

  if (user.status === 'suspended' && user.suspended_until && new Date(user.suspended_until) > new Date()) {
    throw new AppError(403, `Compte suspendu jusqu'au ${new Date(user.suspended_until).toISOString()}.`, 'ACCOUNT_SUSPENDED');
  }

  if (!user.emailVerified) {
    throw new AppError(403, 'Email non vérifié. Consultez votre boîte mail pour activer votre compte.', 'EMAIL_NOT_VERIFIED');
  }

  await markAttemptSuccess(pseudo, ip);

  const accessToken = generateAccessToken(user.id, user.role);
  const rawRefresh = generateOpaqueToken();
  const refreshDuration = rememberMe ? '30 days' : '7 days';

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '${refreshDuration}')`,
    [user.id, hashToken(rawRefresh)],
  );

  const { password_hash: _, suspended_until: __, ...safeUser } = user;
  return { accessToken, refreshToken: rawRefresh, expiresIn: 900, user: safeUser };
}

export async function refresh(rawToken: string): Promise<TokenPair> {
  const tokenHash = hashToken(rawToken);
  const { rows } = await pool.query<RefreshTokenRow>(
    `SELECT rt.id, rt.user_id, rt.expires_at, u.role
     FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL`,
    [tokenHash],
  );

  if (rows.length === 0) {
    throw new AppError(401, 'Refresh token invalide ou expiré.', 'INVALID_REFRESH_TOKEN');
  }
  if (new Date(rows[0].expires_at) < new Date()) {
    throw new AppError(401, 'Refresh token expiré.', 'REFRESH_TOKEN_EXPIRED');
  }

  await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1', [rows[0].id]);

  const newAccessToken = generateAccessToken(rows[0].user_id, rows[0].role);
  const newRawRefresh = generateOpaqueToken();
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
    [rows[0].user_id, hashToken(newRawRefresh)],
  );

  return { accessToken: newAccessToken, refreshToken: newRawRefresh, expiresIn: 900 };
}

export async function logout(rawToken: string): Promise<void> {
  await pool.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL',
    [hashToken(rawToken)],
  );
}

export async function forgotPassword(email: string): Promise<void> {
  const { rows } = await pool.query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
    [email],
  );
  if (rows.length === 0) return;

  const rawToken = generateOpaqueToken();
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
    [rows[0].id, hashToken(rawToken)],
  );

  try {
    await sendPasswordResetEmail(email, rawToken);
  } catch (err) {
    console.error('Envoi de l\'email de réinitialisation échoué :', err);
  }
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const { rows } = await pool.query<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [hashToken(rawToken)],
  );

  if (rows.length === 0) {
    throw new AppError(400, 'Token invalide, expiré ou déjà utilisé.', 'INVALID_RESET_TOKEN');
  }

  const newHash = await hashPassword(newPassword);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, rows[0].user_id]);
    await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [rows[0].id]);
    await client.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [rows[0].user_id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function verifyEmail(rawToken: string): Promise<void> {
  const { rows } = await pool.query<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM email_verification_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [hashToken(rawToken)],
  );

  if (rows.length === 0) {
    throw new AppError(400, 'Token de vérification invalide ou expiré.', 'INVALID_VERIFICATION_TOKEN');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1', [rows[0].user_id]);
    await client.query('UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1', [rows[0].id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
