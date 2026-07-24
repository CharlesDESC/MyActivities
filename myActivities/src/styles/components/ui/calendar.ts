import { StyleSheet } from 'react-native';

import { MINIMUM_TOUCH_TARGET } from '@/constants/accessibility';
import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { gap: Spacing.one },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.one,
  },
  navButton: {
    minWidth: MINIMUM_TOUCH_TARGET,
    minHeight: MINIMUM_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDisabled: { opacity: 0.3 },

  weekRow: { flexDirection: 'row' },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    margin: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});
