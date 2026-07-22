jest.unmock('../../lib/redis');

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockKeys = jest.fn();
const mockDel = jest.fn();
const mockOn = jest.fn();

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    on: mockOn,
    get: mockGet,
    set: mockSet,
    keys: mockKeys,
    del: mockDel,
  })),
}));

import { getCachedActivities, setCachedActivities, invalidateActivitiesCache } from '../../lib/redis';

beforeEach(() => jest.clearAllMocks());

describe('gestionnaire d\'erreur de connexion', () => {
  // Le handler est enregistré à l'import du module ; on le récupère pour
  // l'exécuter à la main (jest.clearAllMocks efface l'historique de mockOn).
  const errorHandler = mockOn.mock.calls.find(([event]) => event === 'error')?.[1] as
    | ((err: Error) => void)
    | undefined;

  it('registers an error listener so a Redis outage never crashes the app', () => {
    expect(errorHandler).toBeDefined();
  });

  it('stays silent in test', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler!(new Error('ECONNREFUSED'));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('logs the failure outside of test', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    errorHandler!(new Error('ECONNREFUSED'));

    expect(spy).toHaveBeenCalledWith('[Redis] connection error:', 'ECONNREFUSED');
    process.env.NODE_ENV = previousEnv;
    spy.mockRestore();
  });
});

describe('getCachedActivities', () => {
  it('returns parsed data on cache hit', async () => {
    mockGet.mockResolvedValueOnce(JSON.stringify({ data: [1, 2] }));
    await expect(getCachedActivities({ lat: 45 })).resolves.toEqual({ data: [1, 2] });
  });

  it('returns null on cache miss', async () => {
    mockGet.mockResolvedValueOnce(null);
    await expect(getCachedActivities({ lat: 45 })).resolves.toBeNull();
  });

  it('returns null when redis is unavailable (best-effort)', async () => {
    mockGet.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(getCachedActivities({ lat: 45 })).resolves.toBeNull();
  });

  it('builds the same cache key regardless of param order', async () => {
    mockGet.mockResolvedValue(null);
    await getCachedActivities({ lat: 45, lng: 4 });
    await getCachedActivities({ lng: 4, lat: 45 });
    expect(mockGet.mock.calls[0][0]).toBe(mockGet.mock.calls[1][0]);
  });
});

describe('setCachedActivities', () => {
  it('stores serialized data with a 60s TTL', async () => {
    mockSet.mockResolvedValueOnce('OK');
    await setCachedActivities({ lat: 45 }, { data: [] });
    expect(mockSet).toHaveBeenCalledWith(
      expect.stringContaining('activities:'),
      JSON.stringify({ data: [] }),
      'EX',
      60,
    );
  });

  it('swallows redis errors silently', async () => {
    mockSet.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(setCachedActivities({ lat: 45 }, { data: [] })).resolves.toBeUndefined();
  });
});

describe('invalidateActivitiesCache', () => {
  it('deletes all activity cache keys', async () => {
    mockKeys.mockResolvedValueOnce(['activities:a', 'activities:b']);
    mockDel.mockResolvedValueOnce(2);
    await invalidateActivitiesCache();
    expect(mockDel).toHaveBeenCalledWith('activities:a', 'activities:b');
  });

  it('does not call del when there is nothing to invalidate', async () => {
    mockKeys.mockResolvedValueOnce([]);
    await invalidateActivitiesCache();
    expect(mockDel).not.toHaveBeenCalled();
  });

  it('swallows redis errors silently', async () => {
    mockKeys.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(invalidateActivitiesCache()).resolves.toBeUndefined();
  });
});
