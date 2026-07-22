import { ListActivitiesSchema, CreateActivitySchema, UpdateActivitySchema } from '../../schemas/activity';

const validCreate = {
  name: 'Escalade en salle',
  category: 'sport',
  description: 'Une salle d\'escalade avec des murs de 12m et des blocs tous niveaux.',
  priceMin: 8,
  priceMax: 15,
};

describe('ListActivitiesSchema', () => {
  it('normalises a single category into an array', () => {
    const parsed = ListActivitiesSchema.parse({ lat: '45.76', lng: '4.83', category: 'sport' });
    expect(parsed.category).toEqual(['sport']);
  });

  it('keeps an array of categories as-is', () => {
    const parsed = ListActivitiesSchema.parse({ lat: '45.76', lng: '4.83', category: ['sport', 'culture'] });
    expect(parsed.category).toEqual(['sport', 'culture']);
  });

  it('applies pagination defaults', () => {
    const parsed = ListActivitiesSchema.parse({ lat: '45.76', lng: '4.83' });
    expect(parsed).toMatchObject({ page: 1, limit: 20, radius: 5, sort: 'distance' });
  });
});

describe('CreateActivitySchema', () => {
  it('accepts a valid payload', () => {
    expect(() => CreateActivitySchema.parse(validCreate)).not.toThrow();
  });

  it('rejects priceMin greater than priceMax', () => {
    expect(() => CreateActivitySchema.parse({ ...validCreate, priceMin: 20, priceMax: 5 })).toThrow();
  });

  it('accepts a future initial slot', () => {
    const startsAt = new Date(Date.now() + 86_400_000).toISOString();
    expect(() => CreateActivitySchema.parse({
      ...validCreate,
      initialSlot: { startsAt, capacity: 20 },
    })).not.toThrow();
  });

  it('rejects a past initial slot', () => {
    expect(() => CreateActivitySchema.parse({
      ...validCreate,
      initialSlot: { startsAt: '2020-01-01T10:00:00.000Z', capacity: 20 },
    })).toThrow();
  });
});

describe('UpdateActivitySchema', () => {
  it('accepts a valid partial update', () => {
    expect(() => UpdateActivitySchema.parse({ name: 'Nouveau nom' })).not.toThrow();
  });

  it('does not accept an establishment-only change', () => {
    expect(() => UpdateActivitySchema.parse({ establishmentId: '11111111-1111-1111-1111-111111111111' })).toThrow();
  });

  it('rejects an empty body', () => {
    expect(() => UpdateActivitySchema.parse({})).toThrow();
  });

  it('rejects priceMin greater than priceMax', () => {
    expect(() => UpdateActivitySchema.parse({ priceMin: 20, priceMax: 5 })).toThrow();
  });
});
