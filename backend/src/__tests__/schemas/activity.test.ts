import { ListActivitiesSchema, CreateActivitySchema, UpdateActivitySchema } from '../../schemas/activity';

const validCreate = {
  name: 'Escalade en salle',
  category: 'sport',
  description: 'Une salle d\'escalade avec des murs de 12m et des blocs tous niveaux.',
  address: '1 rue du Test, Lyon',
  latitude: 45.76,
  longitude: 4.83,
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
});

describe('UpdateActivitySchema', () => {
  it('accepts a valid partial update', () => {
    expect(() => UpdateActivitySchema.parse({ name: 'Nouveau nom' })).not.toThrow();
  });

  it('rejects an empty body', () => {
    expect(() => UpdateActivitySchema.parse({})).toThrow();
  });

  it('rejects latitude without longitude', () => {
    expect(() => UpdateActivitySchema.parse({ latitude: 45.76 })).toThrow();
  });

  it('rejects longitude without latitude', () => {
    expect(() => UpdateActivitySchema.parse({ longitude: 4.83 })).toThrow();
  });

  it('accepts latitude and longitude together', () => {
    expect(() => UpdateActivitySchema.parse({ latitude: 45.76, longitude: 4.83 })).not.toThrow();
  });

  it('rejects priceMin greater than priceMax', () => {
    expect(() => UpdateActivitySchema.parse({ priceMin: 20, priceMax: 5 })).toThrow();
  });
});
