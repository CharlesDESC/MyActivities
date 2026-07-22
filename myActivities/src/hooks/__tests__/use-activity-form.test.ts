import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useActivityForm, type ActivityFormState } from '@/hooks/use-activity-form';
import { api, ApiError } from '@/lib/api';
import type { ActivityDetail } from '@/types/activity';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, api: { post: jest.fn(), patch: jest.fn() } };
});

const mockPost = api.post as jest.Mock;
const mockPatch = api.patch as jest.Mock;

const ACTIVITY: ActivityDetail = {
  id: 'act-1',
  name: 'Atelier poterie',
  category: 'art',
  description: 'Un atelier complet pour découvrir la poterie.',
  address: '10 rue des Arts, Paris',
  latitude: 48.8566,
  longitude: 2.3522,
  avgRating: 4.5,
  reviewCount: 8,
  priceMin: 15,
  priceMax: 30,
  coverImageUrl: null,
  openingHours: null,
  accessibilityPmr: true,
  accessibilityStroller: false,
  websiteUrl: null,
  photos: [],
  organizer: { id: 'org-1', pseudo: 'Organisateur' },
  status: 'published',
  createdAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-07-01T10:00:00.000Z',
};

const VALID: ActivityFormState = {
  name: '  Atelier poterie  ',
  category: 'art',
  description: '  Une description suffisamment longue pour être valide.  ',
  address: '  10 rue des Arts, Paris  ',
  latitude: '48.8566',
  longitude: '2.3522',
  priceMin: '15',
  priceMax: '30',
  websiteUrl: '',
  pmr: true,
  stroller: false,
};

beforeEach(() => {
  mockPost.mockReset().mockResolvedValue(ACTIVITY);
  mockPatch.mockReset().mockResolvedValue(ACTIVITY);
});

async function fillForm(
  result: { current: ReturnType<typeof useActivityForm> },
  overrides: Partial<ActivityFormState> = {},
) {
  const values = { ...VALID, ...overrides };
  await act(async () => {
    (Object.keys(values) as (keyof ActivityFormState)[]).forEach((key) => {
      result.current.setField(key, values[key] as never);
    });
  });
}

describe('useActivityForm — initialisation', () => {
  it('starts with an empty create form', async () => {
    const { result } = await renderHook(() => useActivityForm());

    expect(result.current.values).toMatchObject({
      name: '', category: 'autre', latitude: '', priceMin: '', pmr: false,
    });
    expect(result.current.isEditing).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('maps an existing activity to the edit form', async () => {
    const { result } = await renderHook(() =>
      useActivityForm({ activityId: ACTIVITY.id, initial: ACTIVITY }),
    );

    expect(result.current.isEditing).toBe(true);
    expect(result.current.values).toMatchObject({
      name: ACTIVITY.name,
      latitude: '48.8566',
      priceMin: '15',
      websiteUrl: '',
      pmr: true,
    });
  });

  it('prefills when the activity arrives asynchronously', async () => {
    const hook = await renderHook(
      ({ initial }: { initial: ActivityDetail | null }) => useActivityForm({ initial }),
      { initialProps: { initial: null } },
    );

    await hook.rerender({ initial: { ...ACTIVITY, websiteUrl: 'https://example.com' } });

    await waitFor(() => expect(hook.result.current.values.name).toBe(ACTIVITY.name));
    expect(hook.result.current.values.websiteUrl).toBe('https://example.com');
  });
});

describe('useActivityForm — validation', () => {
  it('reports all required and numeric errors', async () => {
    const { result } = await renderHook(() => useActivityForm());

    await act(async () => { await result.current.submit(); });

    expect(result.current.errors).toMatchObject({
      name: expect.any(String),
      description: expect.any(String),
      address: expect.any(String),
      latitude: expect.any(String),
      longitude: expect.any(String),
      priceMin: expect.any(String),
      priceMax: expect.any(String),
    });
    expect(mockPost).not.toHaveBeenCalled();
  });

  it.each([
    ['latitude', 'abc'],
    ['latitude', '91'],
    ['latitude', '-91'],
    ['longitude', 'abc'],
    ['longitude', '181'],
    ['longitude', '-181'],
    ['priceMin', '-1'],
    ['priceMin', 'abc'],
    ['priceMax', '-1'],
    ['priceMax', 'abc'],
  ] as const)('rejects invalid %s value %s', async (field, value) => {
    const { result } = await renderHook(() => useActivityForm());
    await fillForm(result, { [field]: value });

    await act(async () => { await result.current.submit(); });

    expect(result.current.errors[field]).toBeDefined();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects a minimum price greater than the maximum price', async () => {
    const { result } = await renderHook(() => useActivityForm());
    await fillForm(result, { priceMin: '50', priceMax: '20' });

    await act(async () => { await result.current.submit(); });

    expect(result.current.errors.priceMin).toContain('prix min');
  });

  it('clears field and global errors when a field changes', async () => {
    const { result } = await renderHook(() => useActivityForm());
    await act(async () => { await result.current.submit(); });
    expect(result.current.errors.name).toBeDefined();

    await act(async () => { result.current.setField('name', 'Nouveau nom'); });

    expect(result.current.errors.name).toBeUndefined();
    expect(result.current.errors.global).toBeUndefined();
  });
});

describe('useActivityForm — enregistrement', () => {
  it('creates a trimmed and normalized activity', async () => {
    const { result } = await renderHook(() => useActivityForm());
    await fillForm(result);

    let created: ActivityDetail | null = null;
    await act(async () => { created = await result.current.submit(); });

    expect(created).toEqual(ACTIVITY);
    expect(mockPost).toHaveBeenCalledWith('/activities', {
      name: 'Atelier poterie',
      category: 'art',
      description: 'Une description suffisamment longue pour être valide.',
      address: '10 rue des Arts, Paris',
      latitude: 48.8566,
      longitude: 2.3522,
      priceMin: 15,
      priceMax: 30,
      accessibility: { pmr: true, stroller: false },
      websiteUrl: null,
    });
    expect(result.current.isSubmitting).toBe(false);
  });

  it('keeps a non-empty website URL', async () => {
    const { result } = await renderHook(() => useActivityForm());
    await fillForm(result, { websiteUrl: '  https://example.com  ' });

    await act(async () => { await result.current.submit(); });

    expect(mockPost.mock.calls[0][1].websiteUrl).toBe('https://example.com');
  });

  it('patches the activity in edit mode', async () => {
    const { result } = await renderHook(() => useActivityForm({ activityId: 'act-1' }));
    await fillForm(result);

    await act(async () => { await result.current.submit(); });

    expect(mockPatch).toHaveBeenCalledWith('/activities/act-1', expect.any(Object));
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('exposes an API error and rethrows it', async () => {
    const failure = new ApiError('Activité refusée', 400);
    mockPost.mockRejectedValue(failure);
    const { result } = await renderHook(() => useActivityForm());
    await fillForm(result);

    let caught: unknown;
    await act(async () => {
      try {
        await result.current.submit();
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBe(failure);
    expect(result.current.errors.global).toBe('Activité refusée');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('uses a generic message for an unexpected failure', async () => {
    const failure = new Error('offline');
    mockPost.mockRejectedValue(failure);
    const { result } = await renderHook(() => useActivityForm());
    await fillForm(result);

    let caught: unknown;
    await act(async () => {
      try {
        await result.current.submit();
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBe(failure);
    expect(result.current.errors.global).toBe('Enregistrement impossible');
  });
});
