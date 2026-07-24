import { MINIMUM_TOUCH_TARGET } from '@/constants/accessibility';
import { CATEGORY_CONFIG } from '@/types/activity';

function relativeLuminance(hex: string): number {
  const channels = hex
    .match(/[0-9a-f]{2}/gi)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function composite(foreground: string, background: string, alpha: number): string {
  const channels = [0, 1, 2].map((index) => {
    const start = 1 + index * 2;
    const foregroundChannel = Number.parseInt(foreground.slice(start, start + 2), 16);
    const backgroundChannel = Number.parseInt(background.slice(start, start + 2), 16);
    return Math.round(foregroundChannel * alpha + backgroundChannel * (1 - alpha))
      .toString(16)
      .padStart(2, '0');
  });

  return `#${channels.join('')}`;
}

describe('accessibility design tokens', () => {
  it('uses a touch target larger than the WCAG 2.2 minimum', () => {
    expect(MINIMUM_TOUCH_TARGET).toBeGreaterThanOrEqual(24);
    expect(MINIMUM_TOUCH_TARGET).toBe(44);
  });

  it.each(Object.entries(CATEGORY_CONFIG))(
    'keeps the %s icon above 3:1 on its tinted backgrounds',
    (_category, config) => {
      const alpha = 0x22 / 255;
      const lightTint = composite(config.color, '#FFFFFF', alpha);
      const darkTint = composite(config.color, '#000000', alpha);

      expect(contrastRatio(config.color, lightTint)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(config.color, darkTint)).toBeGreaterThanOrEqual(3);
    },
  );
});
