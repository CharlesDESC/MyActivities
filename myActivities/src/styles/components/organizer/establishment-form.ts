import { StyleSheet } from 'react-native';

import { MINIMUM_TOUCH_TARGET } from '@/constants/accessibility';
import { BottomTabInset, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  form: { gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.six },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  iconButton: {
    minWidth: MINIMUM_TOUCH_TARGET,
    minHeight: MINIMUM_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: Spacing.one },
  globalError: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderLeftWidth: 3,
    borderLeftColor: '#D63A3A',
  },
  errorText: { color: '#D63A3A' },
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
