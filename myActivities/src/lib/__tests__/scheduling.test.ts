import { combineLocalDateAndTime } from '@/lib/scheduling';

describe('combineLocalDateAndTime', () => {
  it('convertit la date et l’heure locales en ISO sans décaler l’heure choisie', () => {
    const result = combineLocalDateAndTime('2026-08-15', '10:30');
    const date = new Date(result!);

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(15);
    expect(date.getHours()).toBe(10);
    expect(date.getMinutes()).toBe(30);
  });

  it('refuse une date ou une heure invalide', () => {
    expect(combineLocalDateAndTime('2026-02-31', '10:30')).toBeNull();
    expect(combineLocalDateAndTime('2026-08-15', '25:00')).toBeNull();
    expect(combineLocalDateAndTime('15/08/2026', '10:30')).toBeNull();
  });
});
