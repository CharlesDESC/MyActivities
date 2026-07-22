import { StyleSheet } from 'react-native';

import { Spacing, WebContentWidth } from '@/constants/theme';

export const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: WebContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
});
