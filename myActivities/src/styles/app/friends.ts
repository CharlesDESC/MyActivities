import { StyleSheet } from 'react-native';

import { MINIMUM_TOUCH_TARGET } from '@/constants/accessibility';
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
  backButton: {
    minWidth: MINIMUM_TOUCH_TARGET,
    minHeight: MINIMUM_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  smallBtn: { paddingHorizontal: Spacing.three, minHeight: MINIMUM_TOUCH_TARGET },
  removeButton: {
    minWidth: MINIMUM_TOUCH_TARGET,
    minHeight: MINIMUM_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: { fontSize: 16, paddingHorizontal: Spacing.two },
  empty: { textAlign: 'center', paddingTop: Spacing.six },
});
