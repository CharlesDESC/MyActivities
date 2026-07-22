import { StyleSheet } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
});
