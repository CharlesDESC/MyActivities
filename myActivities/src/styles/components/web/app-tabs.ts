import { StyleSheet } from 'react-native';

import { Spacing, WebContentWidth, WebHeaderHeight } from '@/constants/theme';

export const styles = StyleSheet.create({
  shell: { flex: 1 },
  slot: { flex: 1 },

  headerBar: {
    width: '100%',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.25)',
  },
  headerInner: {
    width: '100%',
    maxWidth: WebContentWidth,
    height: WebHeaderHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },

  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  brandName: { fontWeight: '800' },
  brandPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#208AEF',
  },
  brandPillText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },

  tabs: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  pressed: { opacity: 0.7 },
  tabButtonView: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
  },
});
