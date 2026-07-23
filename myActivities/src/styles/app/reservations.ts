import { StyleSheet } from 'react-native';

import { BottomTabInset, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  headerText: { flex: 1, gap: Spacing.half },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingTop: Spacing.six },

  list: { paddingBottom: BottomTabInset + Spacing.four, gap: Spacing.two },

  slot: { borderRadius: 12, padding: Spacing.three, gap: Spacing.two },
  slotHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  slotTitle: { flex: 1, textTransform: 'capitalize' },
  countBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.half },

  noAttendee: { paddingLeft: Spacing.four },
  attendee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingLeft: Spacing.two,
  },

  empty: { alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.six, paddingHorizontal: Spacing.four },
  emptyText: { textAlign: 'center', lineHeight: 20 },
});
