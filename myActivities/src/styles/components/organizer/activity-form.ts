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
  backIcon: { fontSize: 24 },
  title: {},

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.six },

  form: {
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
  },

  globalError: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  errorText: { color: '#EF4444' },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },

  multiline: { minHeight: 96, textAlignVertical: 'top' },

  rowFields: { flexDirection: 'row', gap: Spacing.three },
  flex: { flex: 1 },

  toggles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  checkMark: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

  submit: { marginTop: Spacing.two },
});
