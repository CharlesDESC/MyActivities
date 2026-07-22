// Mock ioredis pour éviter toute connexion réelle (utilisé par createBroker)
jest.mock('ioredis', () => {
  const { EventEmitter } = require('node:events');
  return class MockRedis extends EventEmitter {
    subscribe = jest.fn().mockResolvedValue(1);
    publish = jest.fn().mockResolvedValue(1);
    quit = jest.fn().mockResolvedValue('OK');
  };
});

import { EventEmitter } from 'node:events';
import { RedisBroker, createBroker } from '../../realtime/broker';
import { REALTIME_CHANNEL, RealtimeEvent } from '../../realtime/events';

function makeFakeRedis() {
  const ee = new EventEmitter() as any;
  ee.subscribe = jest.fn().mockResolvedValue(1);
  ee.publish = jest.fn().mockResolvedValue(1);
  ee.quit = jest.fn().mockResolvedValue('OK');
  return ee;
}

const sampleEvent: RealtimeEvent = {
  type: 'message:new',
  recipients: ['user-1', 'user-2'],
  payload: { id: 'msg-1' },
};

describe('RedisBroker', () => {
  it('subscribes to the realtime channel on construction', () => {
    const pub = makeFakeRedis();
    const sub = makeFakeRedis();
    new RedisBroker(pub, sub);
    expect(sub.subscribe).toHaveBeenCalledWith(REALTIME_CHANNEL);
  });

  it('publishes the serialized event to Redis', async () => {
    const pub = makeFakeRedis();
    const sub = makeFakeRedis();
    const broker = new RedisBroker(pub, sub);
    await broker.publish(sampleEvent);
    expect(pub.publish).toHaveBeenCalledWith(REALTIME_CHANNEL, JSON.stringify(sampleEvent));
  });

  it('delivers events received from Redis to local subscribers', () => {
    const pub = makeFakeRedis();
    const sub = makeFakeRedis();
    const broker = new RedisBroker(pub, sub);
    const handler = jest.fn();
    broker.subscribe(handler);

    sub.emit('message', REALTIME_CHANNEL, JSON.stringify(sampleEvent));
    expect(handler).toHaveBeenCalledWith(sampleEvent);
  });

  it('ignores malformed payloads received from Redis', () => {
    const pub = makeFakeRedis();
    const sub = makeFakeRedis();
    const broker = new RedisBroker(pub, sub);
    const handler = jest.fn();
    broker.subscribe(handler);

    sub.emit('message', REALTIME_CHANNEL, 'not-json{');
    expect(handler).not.toHaveBeenCalled();
  });

  it('falls back to in-process delivery when Redis publish fails', async () => {
    const pub = makeFakeRedis();
    const sub = makeFakeRedis();
    pub.publish.mockRejectedValueOnce(new Error('redis down'));
    const broker = new RedisBroker(pub, sub);
    const handler = jest.fn();
    broker.subscribe(handler);

    await broker.publish(sampleEvent);
    expect(handler).toHaveBeenCalledWith(sampleEvent);
  });

  it('closes both Redis connections', async () => {
    const pub = makeFakeRedis();
    const sub = makeFakeRedis();
    const broker = new RedisBroker(pub, sub);
    await broker.close();
    expect(pub.quit).toHaveBeenCalled();
    expect(sub.quit).toHaveBeenCalled();
  });
});

describe('createBroker', () => {
  it('builds a RedisBroker instance from config', async () => {
    const broker = createBroker();
    expect(broker).toBeInstanceOf(RedisBroker);
    await broker.close();
  });
});
