jest.mock('../../db/pool', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

import { pool } from '../../db/pool';
import * as messageService from '../../services/message.service';

const mockQuery = pool.query as jest.Mock;
const mockConnect = pool.connect as jest.Mock;

beforeEach(() => jest.clearAllMocks());

const mockMessageRow = {
  id: 'msg-1',
  conversationId: 'conv-1',
  content: 'Bonjour',
  createdAt: new Date(),
  readAt: null,
  sender: { id: 'user-1', pseudo: 'Alice', avatarUrl: null },
};

/** Prépare un client de transaction (`pool.connect`) renvoyant les rows fournis. */
function mockTxClient(queryResults: unknown[]) {
  const client = { query: jest.fn(), release: jest.fn() };
  queryResults.forEach((r) => client.query.mockResolvedValueOnce(r));
  mockConnect.mockResolvedValue(client);
  return client;
}

describe('message.service — sendMessage (direct)', () => {
  it('throws 422 when messaging oneself', async () => {
    await expect(messageService.sendMessage('user-1', 'member', 'user-1', 'hi')).rejects.toMatchObject({
      statusCode: 422,
      code: 'INVALID_RECIPIENT',
    });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('throws 404 if recipient does not exist or is inactive', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] }); // recipient check
    await expect(messageService.sendMessage('user-1', 'member', 'user-2', 'hi')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('throws 403 NOT_FRIENDS when recipient is a non-friend member with no existing convo', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'user-2', role: 'member' }] }) // recipient
      .mockResolvedValueOnce({ rows: [] })                                              // findDirect: none
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });                                // areFriends: no
    await expect(messageService.sendMessage('user-1', 'member', 'user-2', 'hi')).rejects.toMatchObject({
      statusCode: 403,
      code: 'NOT_FRIENDS',
    });
  });

  it('allows a member to message an organizer without friendship', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'user-2', role: 'organizer' }] }) // recipient
      .mockResolvedValueOnce({ rows: [] });                                                // findDirect: none
    mockTxClient([undefined, { rows: [{ id: 'conv-1' }] }, undefined, undefined]);          // create convo
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'msg-1' }] }) // insert message
      .mockResolvedValueOnce({ rows: [] })                // update last_message_at
      .mockResolvedValueOnce({ rows: [mockMessageRow] }); // fetchMessage

    const result = await messageService.sendMessage('user-1', 'member', 'user-2', 'Bonjour');
    expect(result.message.id).toBe('msg-1');
    expect(result.recipientIds).toEqual(['user-1', 'user-2']);
  });

  it('does not allow an organizer to initiate a conversation with a non-friend member', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'user-2', role: 'member' }] }) // recipient
      .mockResolvedValueOnce({ rows: [] })                                              // findDirect: none
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });                                // areFriends: no

    await expect(
      messageService.sendMessage('user-1', 'organizer', 'user-2', 'Bonjour'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'NOT_FRIENDS' });
  });

  it('does not treat an admin as a publicly contactable organizer', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'user-2', role: 'admin' }] }) // recipient
      .mockResolvedValueOnce({ rows: [] })                                             // findDirect: none
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });                               // areFriends: no

    await expect(
      messageService.sendMessage('user-1', 'member', 'user-2', 'Bonjour'),
    ).rejects.toMatchObject({ statusCode: 403, code: 'NOT_FRIENDS' });
  });

  it('allows an organizer to reply in a conversation already opened by a member', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'user-2', role: 'member' }] }) // recipient
      .mockResolvedValueOnce({ rows: [{ id: 'conv-1' }] })                              // findDirect: exists
      .mockResolvedValueOnce({ rows: [{ id: 'msg-1' }] })                               // insert message
      .mockResolvedValueOnce({ rows: [] })                                              // update
      .mockResolvedValueOnce({ rows: [mockMessageRow] });                               // fetchMessage

    const result = await messageService.sendMessage('user-1', 'organizer', 'user-2', 'Bonjour');
    expect(result.message.id).toBe('msg-1');
    expect(mockConnect).not.toHaveBeenCalled(); // no creation
  });

  it('creates a conversation between friends', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'user-2', role: 'member' }] }) // recipient
      .mockResolvedValueOnce({ rows: [] })                                              // findDirect: none
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ '?column?': 1 }] });               // areFriends: yes
    mockTxClient([undefined, { rows: [{ id: 'conv-1' }] }, undefined, undefined]);
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'msg-1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [mockMessageRow] });

    const result = await messageService.sendMessage('user-1', 'member', 'user-2', 'Bonjour');
    expect(result.message.sender).toMatchObject({ id: 'user-1' });
    expect(mockConnect).toHaveBeenCalled();
  });
});

describe('message.service — sendToConversation', () => {
  it('throws 404 if conversation has no participants', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // getParticipantIds → empty
    await expect(messageService.sendToConversation('user-1', 'conv-x', 'hi')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 403 if sender is not a participant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 'a' }, { user_id: 'b' }] });
    await expect(messageService.sendToConversation('user-1', 'conv-1', 'hi')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('sends and fans out to all participants', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-1' }, { user_id: 'user-2' }, { user_id: 'user-3' }] }) // participants
      .mockResolvedValueOnce({ rows: [{ id: 'msg-1' }] }) // insert
      .mockResolvedValueOnce({ rows: [] })                // update
      .mockResolvedValueOnce({ rows: [mockMessageRow] }); // fetch

    const result = await messageService.sendToConversation('user-1', 'conv-1', 'Salut');
    expect(result.recipientIds).toEqual(['user-1', 'user-2', 'user-3']);
  });
});

describe('message.service — listConversations', () => {
  it('maps a direct and a group conversation', async () => {
    const direct = {
      id: 'conv-1', type: 'direct', title: null, updatedAt: new Date(),
      lastMessageContent: 'Salut', lastMessageAt: new Date(), lastMessageSenderId: 'user-2',
      unreadCount: 2,
      participants: [{ id: 'user-1', pseudo: 'Alice', avatarUrl: null, role: 'member' }],
      otherParticipant: { id: 'user-2', pseudo: 'Bob', avatarUrl: null },
    };
    const group = {
      id: 'grp-1', type: 'group', title: 'Team', updatedAt: new Date(),
      lastMessageContent: null, lastMessageAt: null, lastMessageSenderId: null,
      unreadCount: 0,
      participants: [{ id: 'user-1', pseudo: 'Alice', avatarUrl: null, role: 'admin' }],
      otherParticipant: { id: 'user-2', pseudo: 'Bob', avatarUrl: null },
    };
    mockQuery
      .mockResolvedValueOnce({ rows: [direct, group] }) // data
      .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // count

    const result = await messageService.listConversations('user-1', 1, 20);
    expect(result.data[0]).toMatchObject({ type: 'direct', otherParticipant: { id: 'user-2' } });
    expect(result.data[0].lastMessage).toMatchObject({ content: 'Salut' });
    // Un groupe n'expose pas `otherParticipant`.
    expect(result.data[1]).toMatchObject({ type: 'group', title: 'Team', otherParticipant: null });
    expect(result.meta.total).toBe(2);
  });
});

describe('message.service — getMessages', () => {
  it('throws 404 if conversation not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(messageService.getMessages('user-1', 'conv-x', 1, 20)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 403 if user is not a participant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 'other-1' }, { user_id: 'other-2' }] });
    await expect(messageService.getMessages('user-1', 'conv-1', 1, 20)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('returns paginated messages for a participant', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-1' }, { user_id: 'user-2' }] })
      .mockResolvedValueOnce({ rows: [mockMessageRow] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const result = await messageService.getMessages('user-1', 'conv-1', 1, 20);
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

describe('message.service — deleteConversation', () => {
  it('throws 404 if the conversation does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // getParticipantIds → empty
    await expect(messageService.deleteConversation('user-1', 'conv-x')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws 403 if user is not a participant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 'a' }, { user_id: 'b' }] });
    await expect(messageService.deleteConversation('user-1', 'conv-1')).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('deletes the conversation for everyone and returns all participants', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-1' }, { user_id: 'user-2' }] }) // assertParticipant
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });                               // DELETE conversation

    const result = await messageService.deleteConversation('user-2', 'conv-1');
    const deleteCall = mockQuery.mock.calls[1];
    expect(deleteCall[0]).toContain('DELETE FROM conversations');
    expect(deleteCall[1]).toEqual(['conv-1']);
    // Un organisateur (participant non-initiateur) peut supprimer : aucun rôle requis.
    expect(result.participantIds).toEqual(['user-1', 'user-2']);
  });
});

describe('message.service — markConversationRead', () => {
  it('throws 403 if user is not a participant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 'a' }, { user_id: 'b' }] });
    await expect(messageService.markConversationRead('user-1', 'conv-1')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('marks read and returns the other participants to notify', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-1' }, { user_id: 'user-2' }] }) // participants
      .mockResolvedValueOnce({ rows: [] })                                             // update last_read_at
      .mockResolvedValueOnce({ rowCount: 3, rows: [] });                               // update messages.read_at

    const receipt = await messageService.markConversationRead('user-1', 'conv-1');
    expect(receipt).toMatchObject({ conversationId: 'conv-1', updated: 3, readerId: 'user-1' });
    expect(receipt.recipientIds).toEqual(['user-2']);
  });
});

describe('message.service — createGroup', () => {
  it('throws 422 if no other member is provided', async () => {
    await expect(messageService.createGroup('user-1', 'Team', ['user-1'])).rejects.toMatchObject({
      statusCode: 422,
      code: 'GROUP_NEEDS_MEMBERS',
    });
  });

  it('throws 422 if a member is not a friend', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ friendId: 'user-2' }] }); // only user-2 is a friend
    await expect(messageService.createGroup('user-1', 'Team', ['user-2', 'user-3'])).rejects.toMatchObject({
      statusCode: 422,
      code: 'NOT_ALL_FRIENDS',
    });
  });

  it('creates the group and returns the mapped conversation', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ friendId: 'user-2' }] }); // friends check
    mockTxClient([undefined, { rows: [{ id: 'grp-1' }] }, undefined, undefined, undefined]); // BEGIN,INSERT conv,admin,members,COMMIT
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'grp-1', type: 'group', title: 'Team', updatedAt: new Date(),
        lastMessageContent: null, lastMessageAt: null, lastMessageSenderId: null, unreadCount: 0,
        participants: [
          { id: 'user-1', pseudo: 'Alice', avatarUrl: null, role: 'admin' },
          { id: 'user-2', pseudo: 'Bob', avatarUrl: null, role: 'member' },
        ],
        otherParticipant: null,
      }],
    });

    const convo = await messageService.createGroup('user-1', 'Team', ['user-2']);
    expect(convo).toMatchObject({ id: 'grp-1', type: 'group', title: 'Team' });
    expect(convo.participants).toHaveLength(2);
  });
});

describe('message.service — group management', () => {
  it('addMember: rejects non-admin', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ type: 'group', role: 'member' }] }); // assertGroupAdmin
    await expect(messageService.addMember('user-1', 'grp-1', 'user-3')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('addMember: rejects a non-friend', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ type: 'group', role: 'admin' }] }) // admin ok
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });                   // areFriends: no
    await expect(messageService.addMember('user-1', 'grp-1', 'user-3')).rejects.toMatchObject({
      statusCode: 422,
      code: 'NOT_FRIENDS',
    });
  });

  it('addMember: inserts and returns participants', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ type: 'group', role: 'admin' }] })      // admin
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ '?column?': 1 }] })        // areFriends
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })                         // insert participant
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-1' }, { user_id: 'user-3' }] }); // getParticipantIds

    const result = await messageService.addMember('user-1', 'grp-1', 'user-3');
    expect(result).toMatchObject({ addedUserId: 'user-3' });
    expect(result.participantIds).toContain('user-3');
  });

  it('removeMember: cannot remove self', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ type: 'group', role: 'admin' }] });
    await expect(messageService.removeMember('user-1', 'grp-1', 'user-1')).rejects.toMatchObject({
      statusCode: 422,
      code: 'CANNOT_REMOVE_SELF',
    });
  });

  it('leaveGroup: removes the user and promotes a remaining member if needed', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ type: 'group' }] })          // conversation type
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ role: 'admin' }] }) // delete self
      .mockResolvedValueOnce({ rows: [] })                           // promotion update
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-2' }] });     // getParticipantIds

    const result = await messageService.leaveGroup('user-1', 'grp-1');
    expect(result.participantIds).toEqual(['user-2']);
  });

  it('renameGroup: updates the title (admin) and returns the conversation', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ type: 'group', role: 'admin' }] }) // admin
      .mockResolvedValueOnce({ rows: [] })                                 // update title
      .mockResolvedValueOnce({                                             // getConversation
        rows: [{
          id: 'grp-1', type: 'group', title: 'Renamed', updatedAt: new Date(),
          lastMessageContent: null, lastMessageAt: null, lastMessageSenderId: null, unreadCount: 0,
          participants: [{ id: 'user-1', pseudo: 'Alice', avatarUrl: null, role: 'admin' }],
          otherParticipant: null,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-1' }, { user_id: 'user-2' }] }); // getParticipantIds

    const result = await messageService.renameGroup('user-1', 'grp-1', 'Renamed');
    expect(result.conversation.title).toBe('Renamed');
    expect(result.participantIds).toHaveLength(2);
  });
});
