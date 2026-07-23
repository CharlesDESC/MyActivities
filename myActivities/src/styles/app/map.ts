import { StyleSheet } from 'react-native';

import { BottomTabInset, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  mapContainer: {
    height: '38%',
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  map: { flex: 1 },
  locationRequired: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset,
  },
  locationRequiredCard: {
    alignItems: 'center',
    borderRadius: Spacing.three,
    gap: Spacing.three,
    padding: Spacing.five,
  },
  locationRequiredText: {
    textAlign: 'center',
  },

  listContent: {
    flexGrow: 1,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  listHeader: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.one,
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  separator: { height: Spacing.two },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
});
