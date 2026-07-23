import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useEstablishmentForm } from '@/hooks/use-establishment-form';
import { api, ApiError } from '@/lib/api';
import type { AddressSuggestion, Establishment } from '@/types/establishment';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } };
});

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockPatch = api.patch as jest.Mock;

const suggestion: AddressSuggestion = {
  addressId: 'ban-address-123',
  address: '12 rue de la République, 69001 Lyon',
  latitude: 45.767,
  longitude: 4.835,
};

const establishment: Establishment = {
  id: 'est-1',
  name: 'Atelier des quais',
  address: suggestion.address,
  latitude: suggestion.latitude,
  longitude: suggestion.longitude,
  addressId: suggestion.addressId,
  phone: null,
  websiteUrl: null,
  createdAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-07-01T10:00:00.000Z',
};

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({
    name: 'Atelier prérempli',
    address: '12 rue de la République',
    latitude: 45.767,
    longitude: 4.835,
  });
  mockPost.mockReset().mockResolvedValue(establishment);
  mockPatch.mockReset().mockResolvedValue(establishment);
});

describe('useEstablishmentForm', () => {
  it('prefills a new form from the account SIRET', async () => {
    const { result } = await renderHook(() => useEstablishmentForm(null));
    await waitFor(() => expect(result.current.values.name).toBe('Atelier prérempli'));
    expect(result.current.values.addressQuery).toBe('12 rue de la République');
  });

  it('maps the existing establishment in edit mode', async () => {
    const { result } = await renderHook(() => useEstablishmentForm(establishment));
    expect(result.current.isEditing).toBe(true);
    expect(result.current.selectedAddress).toEqual(suggestion);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('requires a sufficiently long address query', async () => {
    const { result } = await renderHook(() => useEstablishmentForm(null));
    await act(async () => { result.current.setField('addressQuery', '12'); });
    await act(async () => { await result.current.searchAddress(); });
    expect(result.current.errors.address).toBeDefined();
  });

  it('searches and selects an IGN address', async () => {
    const { result } = await renderHook(() => useEstablishmentForm(null));
    await act(async () => { result.current.setField('addressQuery', '12 rue Lyon'); });
    mockGet.mockResolvedValueOnce({ data: [suggestion] });
    await act(async () => { await result.current.searchAddress(); });
    expect(result.current.suggestions).toEqual([suggestion]);

    await act(async () => { result.current.selectAddress(suggestion); });
    expect(result.current.selectedAddress).toEqual(suggestion);
    expect(result.current.values.addressQuery).toBe(suggestion.address);
  });

  it('creates an establishment from normalized fields', async () => {
    const { result } = await renderHook(() => useEstablishmentForm(null));
    await act(async () => {
      result.current.setField('name', '  Atelier des quais  ');
      result.current.setField('websiteUrl', '  https://example.fr  ');
      result.current.selectAddress(suggestion);
    });

    await act(async () => { await result.current.submit(); });
    expect(mockPost).toHaveBeenCalledWith('/establishments', {
      name: 'Atelier des quais',
      addressId: 'ban-address-123',
      address: '12 rue de la République, 69001 Lyon',
      phone: null,
      websiteUrl: 'https://example.fr',
    });
  });

  it('patches an existing establishment', async () => {
    const { result } = await renderHook(() => useEstablishmentForm(establishment));
    await act(async () => { await result.current.submit(); });
    expect(mockPatch).toHaveBeenCalledWith('/establishments/est-1', {
      name: 'Atelier des quais',
      phone: null,
      websiteUrl: null,
    });
  });

  it('exposes an API submission error', async () => {
    const failure = new ApiError('Enregistrement refusé', 409);
    mockPost.mockRejectedValue(failure);
    const { result } = await renderHook(() => useEstablishmentForm(null));
    await act(async () => {
      result.current.setField('name', 'Atelier');
      result.current.selectAddress(suggestion);
    });

    await act(async () => {
      try { await result.current.submit(); } catch { /* attendu */ }
    });
    expect(result.current.errors.global).toBe('Enregistrement refusé');
  });
});
