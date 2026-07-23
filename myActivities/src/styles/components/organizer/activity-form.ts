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
    borderLeftColor: '#D63A3A',
  },
  errorText: { color: '#D63A3A' },

  establishmentRequired: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: 16,
  },
  establishmentRequiredText: { textAlign: 'center' },
  establishmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 12,
  },
  establishmentCardText: { flex: 1, gap: Spacing.half },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },

  multiline: { minHeight: 96, textAlignVertical: 'top' },

  scheduleSection: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 12,
  },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  scheduleHeaderText: { flex: 1, gap: Spacing.half },
  calendarContainer: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  scheduleFields: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  scheduleField: { flex: 1, minWidth: 180 },

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
  checkboxOn: { backgroundColor: '#0077CC', borderColor: '#0077CC' },
  checkMark: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

  submit: { marginTop: Spacing.two },
  delete: { marginTop: Spacing.one },
});
