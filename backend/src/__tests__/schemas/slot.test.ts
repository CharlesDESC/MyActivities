import { SlotsQuerySchema, CreateSlotsSchema } from '../../schemas/slot';

const FUTURE = '2099-01-01T10:00:00.000Z';
const PAST = '2020-01-01T10:00:00.000Z';

describe('SlotsQuerySchema', () => {
  it('accepts an empty query', () => {
    expect(SlotsQuerySchema.parse({})).toEqual({});
  });

  it('accepts an ISO date range', () => {
    expect(SlotsQuerySchema.parse({ from: FUTURE, to: FUTURE })).toEqual({ from: FUTURE, to: FUTURE });
  });

  it('rejects a non-ISO date', () => {
    expect(SlotsQuerySchema.safeParse({ from: '01/01/2026' }).success).toBe(false);
  });
});

describe('CreateSlotsSchema', () => {
  const slot = { startsAt: FUTURE, endsAt: null, capacity: 10 };

  it('accepts a valid batch', () => {
    expect(CreateSlotsSchema.safeParse({ slots: [slot] }).success).toBe(true);
  });

  it('accepts an omitted endsAt', () => {
    expect(CreateSlotsSchema.safeParse({ slots: [{ startsAt: FUTURE, capacity: 5 }] }).success).toBe(true);
  });

  it('rejects a slot in the past', () => {
    const result = CreateSlotsSchema.safeParse({ slots: [{ ...slot, startsAt: PAST }] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Le créneau ne peut pas être dans le passé');
    }
  });

  it('rejects an empty batch', () => {
    expect(CreateSlotsSchema.safeParse({ slots: [] }).success).toBe(false);
  });

  it('rejects a batch over 100 slots', () => {
    const slots = Array.from({ length: 101 }, () => slot);
    expect(CreateSlotsSchema.safeParse({ slots }).success).toBe(false);
  });

  it('rejects a capacity below 1', () => {
    expect(CreateSlotsSchema.safeParse({ slots: [{ ...slot, capacity: 0 }] }).success).toBe(false);
  });

  it('rejects a non-integer capacity', () => {
    expect(CreateSlotsSchema.safeParse({ slots: [{ ...slot, capacity: 2.5 }] }).success).toBe(false);
  });

  it('rejects a capacity above 10000', () => {
    expect(CreateSlotsSchema.safeParse({ slots: [{ ...slot, capacity: 10001 }] }).success).toBe(false);
  });
});
