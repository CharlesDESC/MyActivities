import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.five,
  },
  header: {
    gap: Spacing.two,
  },
  form: {
    gap: Spacing.three,
  },
  globalError: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
  },
  footer: {
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
    gap: Spacing.four,
  },
  stateBox: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  stateIcon: {
    fontSize: 48,
  },
  stateText: {
    textAlign: 'center',
    lineHeight: 22,
  },
  stretchButton: {
    alignSelf: 'stretch',
  },
});
