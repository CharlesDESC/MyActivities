import jwt from 'jsonwebtoken';
import { generateAccessToken, generateOpaqueToken, hashToken } from '../../lib/tokens';
import { config } from '../../config';

describe('lib/tokens', () => {
  describe('generateOpaqueToken', () => {
    it('returns a 64-char hex string', () => {
      expect(generateOpaqueToken()).toMatch(/^[a-f0-9]{64}$/);
    });

    it('generates unique tokens on each call', () => {
      expect(generateOpaqueToken()).not.toBe(generateOpaqueToken());
    });
  });

  describe('hashToken', () => {
    it('returns a 64-char hex string', () => {
      expect(hashToken('test')).toMatch(/^[a-f0-9]{64}$/);
    });

    it('is deterministic for the same input', () => {
      expect(hashToken('abc')).toBe(hashToken('abc'));
    });

    it('differs from its input', () => {
      expect(hashToken('test')).not.toBe('test');
    });

    it('produces different hashes for different inputs', () => {
      expect(hashToken('a')).not.toBe(hashToken('b'));
    });
  });

  describe('generateAccessToken', () => {
    it('returns a verifiable JWT', () => {
      const token = generateAccessToken('user-123', 'member');
      const decoded = jwt.verify(token, config.jwt.accessSecret) as jwt.JwtPayload;
      expect(decoded.sub).toBe('user-123');
      expect(decoded.role).toBe('member');
    });

    it('works for all roles', () => {
      for (const role of ['member', 'organizer', 'admin'] as const) {
        const token = generateAccessToken('user-1', role);
        const decoded = jwt.verify(token, config.jwt.accessSecret) as jwt.JwtPayload;
        expect(decoded.role).toBe(role);
      }
    });
  });
});
