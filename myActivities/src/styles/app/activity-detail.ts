import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1 },

  hero: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 72 },

  body: {
    padding: Spacing.four,
    gap: Spacing.three,
  },

  header: { gap: Spacing.one },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },

  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 100,
    gap: Spacing.one,
  },

  divider: { height: 1, marginVertical: Spacing.two },

  section: { gap: Spacing.two },

  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  organizerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },

  accessibilityRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  accessibilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },

  reviewItem: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  reviewAvatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  reviewBody: { flex: 1, gap: Spacing.one },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },

  ratingInput: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },

  planningModal: {
    padding: Spacing.four,
    borderRadius: Spacing.two,
    gap: Spacing.three,
    marginTop: Spacing.two,
  },

  slotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  slotChip: {
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    minWidth: 84,
    gap: 2,
  },

  ctaRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },
});
