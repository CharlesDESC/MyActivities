import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.one,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1.5,
  },
  error: {
    color: '#EF4444',
  },
});
