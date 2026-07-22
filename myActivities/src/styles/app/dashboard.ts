import { StyleSheet } from 'react-native';

import { BottomTabInset, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  title: { marginBottom: Spacing.three },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingTop: Spacing.six },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  statCard: {
    flexGrow: 1,
    flexBasis: 140,
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.2)',
  },

  sectionTitle: { marginTop: Spacing.five, marginBottom: Spacing.two },
  list: { paddingBottom: BottomTabInset + Spacing.four, gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flexWrap: 'wrap',
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.2)',
  },
  rowName: { flex: 1, minWidth: 120 },
  empty: { textAlign: 'center', paddingTop: Spacing.six },
});
