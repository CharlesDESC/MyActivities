import { StyleSheet } from 'react-native';

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
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  navDisabled: { opacity: 0.3 },

  weekRow: { flexDirection: 'row' },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
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
