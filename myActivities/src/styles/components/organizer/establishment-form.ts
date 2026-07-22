import { StyleSheet } from 'react-native';

import { BottomTabInset, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  form: { gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.six },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  headerText: { flex: 1, gap: Spacing.one },
  globalError: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  errorText: { color: '#EF4444' },
  addressBlock: { gap: Spacing.two },
  suggestions: { borderRadius: 12, overflow: 'hidden' },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.25)',
  },
  suggestionText: { flex: 1 },
  attribution: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, textAlign: 'right' },
  selectedAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
  },
  selectedAddressText: { flex: 1, gap: Spacing.half },
  submit: { marginTop: Spacing.two },
});
