import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  listContent: {
    flexGrow: 1,
  },
  listHeader: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  greetingSection: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.one,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: 13,
    gap: Spacing.two,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  chipsRow: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 100,
  },
  sectionLabel: {
    paddingHorizontal: Spacing.four,
  },
  separator: {
    height: Spacing.two,
  },
  empty: {
    alignItems: 'center',
    paddingTop: Spacing.six,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
