import { StyleSheet } from 'react-native';

import { BottomTabInset, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  // ── En-tête ──────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  backButton: { paddingRight: Spacing.one },
  backIcon: { fontSize: 26, lineHeight: 26 },
  headerTitle: { flex: 1 },

  // ── Onglets ──────────────────────────────
  tabs: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  tab: { flex: 1 },
  tabInner: {
    borderRadius: 12,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },

  // ── Recherche ────────────────────────────
  searchBox: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  error: { color: '#D63A3A', paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },

  // ── Listes ───────────────────────────────
  listContent: { paddingBottom: BottomTabInset + Spacing.four, paddingHorizontal: Spacing.three },
  sectionLabel: { paddingVertical: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  avatar: { fontSize: 24 },
  rowName: { flex: 1 },
  smallBtn: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, minHeight: 0 },
  removeIcon: { fontSize: 16, paddingHorizontal: Spacing.two },
  empty: { textAlign: 'center', paddingTop: Spacing.six },
});
