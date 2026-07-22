import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useEstablishment } from '@/hooks/use-establishment';
import { api, ApiError } from '@/lib/api';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, api: { get: jest.fn() } };
});

const mockGet = api.get as jest.Mock;
const establishment = { id: 'est-1', name: 'Atelier', address: '12 rue' };

beforeEach(() => mockGet.mockReset());

describe('useEstablishment', () => {
  it('loads the unique establishment', async () => {
    mockGet.mockResolvedValue({ data: [establishment] });
    const { result } = await renderHook(() => useEstablishment());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.establishment).toEqual(establishment);
  });

  it('returns null when onboarding is not completed', async () => {
    mockGet.mockResolvedValue({ data: [] });
    const { result } = await renderHook(() => useEstablishment());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.establishment).toBeNull();
  });

  it('exposes API errors and can retry', async () => {
    mockGet
      .mockRejectedValueOnce(new ApiError('Service indisponible', 503))
      .mockResolvedValueOnce({ data: [establishment] });
    const { result } = await renderHook(() => useEstablishment());

    await waitFor(() => expect(result.current.error).toBe('Service indisponible'));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.establishment).toEqual(establishment);
    expect(result.current.error).toBeNull();
  });
});
