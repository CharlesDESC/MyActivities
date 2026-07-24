import { StyleSheet } from 'react-native';

import { MINIMUM_TOUCH_TARGET } from '@/constants/accessibility';
import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    marginHorizontal: Spacing.four,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.75 },

  dateStrip: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    gap: Spacing.half,
  },
  dateDay: { fontSize: 24, fontWeight: '700' },
  dateMonth: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  dateTime: { fontSize: 11 },

  info: {
    flex: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.one,
    justifyContent: 'center',
  },
  name: { lineHeight: 18 },
  categoryLabel: { fontSize: 12, fontWeight: '600' },
  address: { lineHeight: 16 },

  removeBtn: {
    minWidth: MINIMUM_TOUCH_TARGET,
    minHeight: MINIMUM_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
