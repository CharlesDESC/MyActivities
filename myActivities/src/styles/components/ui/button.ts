import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  primary: {
    backgroundColor: '#208AEF',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  labelPrimary: {
    color: '#ffffff',
  },
  labelGhost: {
    color: '#208AEF',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
});
