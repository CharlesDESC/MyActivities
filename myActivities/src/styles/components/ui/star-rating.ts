import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.one,
    alignItems: 'center',
  },
  star: {
    fontSize: 20,
  },
  starSmall: {
    fontSize: 14,
  },
});
