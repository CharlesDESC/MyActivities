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
    alignItems: 'center',
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
    gap: Spacing.four,
  },
  successBox: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  successIcon: {
    fontSize: 48,
  },
  successText: {
    textAlign: 'center',
    lineHeight: 22,
  },
  loginButton: {
    alignSelf: 'stretch',
  },
});
