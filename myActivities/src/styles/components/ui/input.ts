import { StyleSheet } from 'react-native';

import { MINIMUM_TOUCH_TARGET } from '@/constants/accessibility';
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
    right: 0,
    top: 0,
    bottom: 0,
    minWidth: MINIMUM_TOUCH_TARGET,
    minHeight: MINIMUM_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
  },
});
