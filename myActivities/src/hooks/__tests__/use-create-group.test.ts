import { act, renderHook } from '@testing-library/react-native';

import { useCreateGroup } from '@/hooks/use-create-group';
import { api, ApiError } from '@/lib/api';
import type { Conversation } from '@/types/message';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, api: { post: jest.fn() } };
});

const mockPost = api.post as jest.Mock;

const group: Conversation = {
  id: 'grp-1', type: 'group', title: 'Team', otherParticipant: null,
  participants: [{ id: 'user-1', pseudo: 'Alice', avatarUrl: null, role: 'admin' }],
  lastMessage: null, unreadCount: 0, updatedAt: '2026-07-21T10:00:00.000Z',
};

beforeEach(() => { mockPost.mockReset(); });

describe('useCreateGroup', () => {
  it('creates a group and returns the conversation', async () => {
    mockPost.mockResolvedValue(group);
    const { result } = await renderHook(() => useCreateGroup());

    let created: Conversation | undefined;
    await act(async () => { created = await result.current.create('  Team  ', ['user-2']); });

    expect(mockPost).toHaveBeenCalledWith('/messages/groups', { title: 'Team', memberIds: ['user-2'] });
    expect(created).toMatchObject({ id: 'grp-1', type: 'group' });
  });

  it('surfaces and rethrows the error on failure', async () => {
    mockPost.mockRejectedValue(new ApiError('Vous ne pouvez ajouter que vos amis.', 422));
    const { result } = await renderHook(() => useCreateGroup());

    await act(async () => {
      await expect(result.current.create('Team', ['user-2'])).rejects.toThrow('Vous ne pouvez ajouter que vos amis.');
    });
    expect(result.current.error).toBe('Vous ne pouvez ajouter que vos amis.');
  });
});
