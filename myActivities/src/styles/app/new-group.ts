import { StyleSheet } from 'react-native';

import { BottomTabInset, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

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

  form: { paddingHorizontal: Spacing.three, gap: Spacing.two },
  hint: { paddingTop: Spacing.one },

  listContent: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.four },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  avatar: { fontSize: 24 },
  rowName: { flex: 1 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  checkMark: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  empty: { textAlign: 'center', paddingTop: Spacing.six },

  footer: {
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  error: { color: '#EF4444', textAlign: 'center' },
});
