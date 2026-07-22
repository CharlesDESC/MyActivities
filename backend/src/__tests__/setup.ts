process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_at_least_32_chars!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_at_least_32ch!';
process.env.NODE_ENV = 'test';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
process.env.AUTH_RATE_LIMIT_WINDOW_MS = '900000';
process.env.CORS_ORIGIN = 'http://localhost:8081';

// Mock Redis pour éviter les connexions réelles en test
jest.mock('../lib/redis', () => ({
  redis: { on: jest.fn(), get: jest.fn(), set: jest.fn(), del: jest.fn(), keys: jest.fn() },
  getCachedActivities: jest.fn().mockResolvedValue(null),
  setCachedActivities: jest.fn().mockResolvedValue(undefined),
  invalidateActivitiesCache: jest.fn().mockResolvedValue(undefined),
}));
