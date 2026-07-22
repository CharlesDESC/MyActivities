jest.mock('socket.io-client', () => ({ io: jest.fn(() => ({ on: jest.fn(), emit: jest.fn(), disconnect: jest.fn() })) }));

import { getRealtimeClient, __resetRealtimeClient } from '@/lib/socket';
import { SocketIORealtimeClient } from '@/lib/socket/socketio';

afterEach(() => __resetRealtimeClient());

describe('getRealtimeClient', () => {
  it('renvoie une instance Socket.IO', () => {
    expect(getRealtimeClient()).toBeInstanceOf(SocketIORealtimeClient);
  });

  it('renvoie le même singleton à chaque appel', () => {
    expect(getRealtimeClient()).toBe(getRealtimeClient());
  });

  it('recrée une instance après réinitialisation', () => {
    const first = getRealtimeClient();
    __resetRealtimeClient();
    expect(getRealtimeClient()).not.toBe(first);
  });
});
