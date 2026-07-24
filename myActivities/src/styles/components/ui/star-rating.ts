import { StyleSheet } from 'react-native';

import { MINIMUM_TOUCH_TARGET } from '@/constants/accessibility';
import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.one,
    alignItems: 'center',
  },
  target: {
    minWidth: MINIMUM_TOUCH_TARGET,
    minHeight: MINIMUM_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    fontSize: 20,
  },
  starSmall: {
    fontSize: 14,
  },
});
