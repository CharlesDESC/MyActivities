import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.one,
  },
  field: {
    justifyContent: 'center',
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1.5,
  },
  // Laisse la place au bouton œil à droite.
  inputWithAction: {
    paddingRight: 48,
  },
  action: {
    position: 'absolute',
    right: Spacing.three,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  error: {
  },
});
