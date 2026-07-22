import { SendFriendRequestSchema, UserSearchQuerySchema } from '../../schemas/friend';

describe('SendFriendRequestSchema', () => {
  it('accepts a valid uuid', () => {
    expect(SendFriendRequestSchema.safeParse({ addresseeId: '11111111-1111-1111-1111-111111111111' }).success).toBe(true);
  });

  it('rejects a non-uuid', () => {
    expect(SendFriendRequestSchema.safeParse({ addresseeId: 'nope' }).success).toBe(false);
  });
});

describe('UserSearchQuerySchema', () => {
  it('trims and accepts a non-empty query', () => {
    const parsed = UserSearchQuerySchema.parse({ q: '  bob ' });
    expect(parsed.q).toBe('bob');
  });

  it('rejects an empty query', () => {
    expect(UserSearchQuerySchema.safeParse({ q: '   ' }).success).toBe(false);
  });
});
