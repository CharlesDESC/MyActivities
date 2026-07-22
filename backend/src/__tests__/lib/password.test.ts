import { hashPassword, verifyPassword } from '../../lib/password';

describe('lib/password', () => {
  const VALID_PASSWORD = 'MyPassword1';

  it('hashes a password into a bcrypt string', async () => {
    const hash = await hashPassword(VALID_PASSWORD);
    expect(hash).toMatch(/^\$2b\$/);
    expect(hash).not.toBe(VALID_PASSWORD);
  });

  it('produces a different hash each call (salt)', async () => {
    const hash1 = await hashPassword(VALID_PASSWORD);
    const hash2 = await hashPassword(VALID_PASSWORD);
    expect(hash1).not.toBe(hash2);
  });

  it('verifies a correct password', async () => {
    const hash = await hashPassword(VALID_PASSWORD);
    await expect(verifyPassword(VALID_PASSWORD, hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword(VALID_PASSWORD);
    await expect(verifyPassword('WrongPassword1', hash)).resolves.toBe(false);
  });
});
