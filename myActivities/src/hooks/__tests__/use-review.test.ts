import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useReview } from '@/hooks/use-review';
import { api, ApiError } from '@/lib/api';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, api: { post: jest.fn() } };
});

let mockUser: { id: string } | null = { id: 'user-1' };
jest.mock('@/context/auth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockPost = api.post as jest.Mock;

beforeEach(() => {
  mockUser = { id: 'user-1' };
  mockPost.mockReset().mockResolvedValue({});
});

describe('useReview', () => {
  it('posts the rating and calls onSuccess', async () => {
    const onSuccess = jest.fn();
    const { result } = await renderHook(() => useReview('act-1', onSuccess));

    await act(async () => { await result.current.submitRating(4); });

    expect(mockPost).toHaveBeenCalledWith('/activities/act-1/reviews', { rating: 4 });
    expect(onSuccess).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('does nothing when there is no authenticated user', async () => {
    mockUser = null;
    const { result } = await renderHook(() => useReview('act-1'));

    await act(async () => { await result.current.submitRating(5); });

    expect(mockPost).not.toHaveBeenCalled();
  });

  it('exposes the server message on failure and does not call onSuccess', async () => {
    mockPost.mockRejectedValue(new ApiError('Vous avez déjà noté cette activité.', 409));
    const onSuccess = jest.fn();
    const { result } = await renderHook(() => useReview('act-1', onSuccess));

    await act(async () => { await result.current.submitRating(4); });

    await waitFor(() => expect(result.current.error).toBe('Vous avez déjà noté cette activité.'));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('falls back to a generic message on a network error', async () => {
    mockPost.mockRejectedValue(new Error('offline'));
    const { result } = await renderHook(() => useReview('act-1'));

    await act(async () => { await result.current.submitRating(3); });

    await waitFor(() => expect(result.current.error).toBe('Erreur lors de la soumission'));
  });
});
