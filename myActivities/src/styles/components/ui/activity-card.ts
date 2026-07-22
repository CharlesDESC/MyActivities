import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    marginHorizontal: Spacing.four,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.75,
  },
  thumb: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 36,
  },
  info: {
    flex: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.one,
    justifyContent: 'center',
  },
  name: {
    lineHeight: 18,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});
