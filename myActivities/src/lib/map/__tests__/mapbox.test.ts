import { buildInteractiveMapHtml, buildStaticMapUrl } from '@/lib/map/mapbox';

describe('buildStaticMapUrl', () => {
  it('place la position et les activités sur une image Mapbox', () => {
    const url = buildStaticMapUrl(
      { latitude: 43.582933, longitude: 7.127292 },
      12,
      [{
        id: 'activity-1',
        label: 'Sport',
        color: '#3B82F6',
        position: { latitude: 43.58, longitude: 7.13 },
      }],
      'pk.test-token',
    );

    expect(url).toContain('api.mapbox.com/styles/v1/mapbox/streets-v12/static/');
    expect(url).toContain('pin-s+208aef(7.127292,43.582933)');
    expect(url).toContain('pin-s+3b82f6(7.13,43.58)');
    expect(url).toContain('/7.127292,43.582933,12,0/');
    expect(url).toContain('access_token=pk.test-token');
  });
});

describe('buildInteractiveMapHtml', () => {
  it('configure une carte interactive et transmet les clics de marqueur', () => {
    const html = buildInteractiveMapHtml(
      { latitude: 43.582933, longitude: 7.127292 },
      12,
      [{
        id: 'activity-1',
        label: 'Sport',
        color: '#3B82F6',
        position: { latitude: 43.58, longitude: 7.13 },
      }],
      'pk.test-token',
    );

    expect(html).toContain('mapbox-gl-js/v3.9.4/mapbox-gl.js');
    expect(html).toContain('"latitude":43.582933');
    expect(html).toContain('"id":"activity-1"');
    expect(html).toContain("type: 'marker'");
  });
});
