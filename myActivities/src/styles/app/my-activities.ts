import { StyleSheet } from 'react-native';

import { MINIMUM_TOUCH_TARGET } from '@/constants/accessibility';
import { BottomTabInset, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginBottom: Spacing.three,
    flexWrap: 'wrap',
  },
  title: {},
  newBtn: { paddingHorizontal: Spacing.four },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingTop: Spacing.six },

  list: { paddingBottom: BottomTabInset + Spacing.four, gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.2)',
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rowAction: {
    minWidth: MINIMUM_TOUCH_TARGET,
    minHeight: MINIMUM_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },
  rowBody: { flex: 1, gap: Spacing.half },
  badge: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  badgeText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  empty: { alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.six, paddingHorizontal: Spacing.four },
  emptyEmoji: { fontSize: 44 },
  emptyText: { textAlign: 'center', lineHeight: 20 },
});
