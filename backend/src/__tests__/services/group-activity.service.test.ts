jest.mock('../../db/pool', () => ({ pool: { query: jest.fn(), connect: jest.fn() } }));
import { pool } from '../../db/pool';
import * as service from '../../services/group-activity.service';

const query = pool.query as jest.Mock;
const client = { query: jest.fn(), release: jest.fn() };
beforeEach(() => {
  jest.resetAllMocks();
  (pool.connect as jest.Mock).mockResolvedValue(client);
});

function writeSetup(role = 'member', type = 'group') {
  client.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
    .mockResolvedValueOnce({ rows: [{ role, type }] });
}

describe('group activity permissions and writes', () => {
  it('lets an ordinary member propose a published activity and returns all recipients', async () => {
    writeSetup();
    client.query.mockResolvedValueOnce({ rows: [{ id: 'a' }] })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ user_id: 'member' }, { user_id: 'admin' }] })
      .mockResolvedValueOnce({});
    await expect(service.change('member', 'group', 'a', false)).resolves.toEqual(['member', 'admin']);
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO conversation_activities'), ['group', 'a', 'member']);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.query.mock.calls.some(([sql]) => /INSERT INTO planning/.test(sql))).toBe(false);
    expect(client.release).toHaveBeenCalled();
  });

  it.each([false, true])('rejects a non-member for remove=%s and rolls back', async (remove) => {
    client.query.mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [] });
    await expect(service.change('outsider', 'group', 'a', remove)).rejects.toMatchObject({ statusCode: 403 });
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('rejects direct conversations', async () => {
    writeSetup('member', 'direct');
    await expect(service.change('member', 'direct', 'a', false)).rejects.toMatchObject({ code: 'NOT_A_GROUP' });
  });

  it('rejects missing or unpublished activities', async () => {
    writeSetup();
    client.query.mockResolvedValueOnce({ rows: [] });
    await expect(service.change('member', 'group', 'a', false)).rejects.toMatchObject({ statusCode: 404 });
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
  });

  it('reports a duplicate without overwriting its author', async () => {
    writeSetup();
    client.query.mockResolvedValueOnce({ rows: [{ id: 'a' }] }).mockResolvedValueOnce({ rowCount: 0 });
    await expect(service.change('member', 'group', 'a', false)).rejects.toMatchObject({ statusCode: 409, code: 'ALREADY_PROPOSED' });
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
  });

  it.each(['member', 'admin'])('allows an authorized removal as %s', async (role) => {
    writeSetup(role);
    client.query.mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ user_id: 'u' }] }).mockResolvedValueOnce({});
    await expect(service.change('u', 'g', 'a', true)).resolves.toEqual(['u']);
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("AND (added_by = $3 OR $4 = 'admin')"), ['g', 'a', 'u', role]);
  });

  it('rejects removal of another member’s proposal', async () => {
    writeSetup();
    client.query.mockResolvedValueOnce({ rowCount: 0 });
    await expect(service.change('u', 'g', 'a', true)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rolls back database failures and releases its connection', async () => {
    writeSetup();
    client.query.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(service.change('u', 'g', 'a', false)).rejects.toThrow('database unavailable');
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });
});

describe('group activity reads', () => {
  it.each(['list', 'search'] as const)('blocks non-members from %s', async (operation) => {
    query.mockResolvedValueOnce({ rows: [] });
    const result = operation === 'list' ? service.list('u', 'g', 1, 20) : service.search('u', 'g', '', 1, 20);
    await expect(result).rejects.toMatchObject({ statusCode: 403 });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('paginates persisted proposals and preserves unavailable placeholders', async () => {
    query.mockResolvedValueOnce({ rows: [{ type: 'group', role: 'member' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'a', available: false, name: 'Activité indisponible' }, { id: 'b' }] });
    await expect(service.list('u', 'g', 2, 1)).resolves.toEqual({ data: [{ id: 'a', available: false, name: 'Activité indisponible' }], hasMore: true });
    expect(query).toHaveBeenLastCalledWith(expect.any(String), ['g', 2, 1]);
  });

  it('passes search text as a bound literal and paginates results', async () => {
    query.mockResolvedValueOnce({ rows: [{ type: 'group', role: 'member' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'a' }] });
    await expect(service.search('u', 'g', "%' OR 1=1", 3, 20)).resolves.toEqual({ data: [{ id: 'a' }], hasMore: false });
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining("a.status = 'published'"), ['g', "%' OR 1=1", 21, 40]);
  });
});
