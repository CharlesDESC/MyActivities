import { StyleSheet } from 'react-native';

import { BottomTabInset, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  listContent: {
    flexGrow: 1,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  listHeader: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.one,
  },
  separator: { height: Spacing.two },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    paddingTop: Spacing.six,
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: { textAlign: 'center', lineHeight: 20 },

  errorContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.four, gap: Spacing.two,
  },
});
