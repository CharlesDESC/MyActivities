import { StyleSheet } from 'react-native';

import { BottomTabInset, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  scroll: {
    flexGrow: 1,
    paddingBottom: BottomTabInset + Spacing.four,
  },

  avatarSection: {
    alignItems: 'center',
    paddingTop: Spacing.five,
    paddingBottom: Spacing.four,
    gap: Spacing.two,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 36 },

  section: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  sectionLabel: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  rowLabel: { flex: 1 },
  divider: { height: 1, marginHorizontal: Spacing.three },

  logoutRow: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.two,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
});
