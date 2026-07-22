import { StyleSheet } from 'react-native';

import { BottomTabInset, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  // ── En-tête ──────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  backButton: { paddingRight: Spacing.one },
  backIcon: { fontSize: 26, lineHeight: 26 },
  headerTitle: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  headerActionIcon: { fontSize: 22, lineHeight: 26 },

  // ── Liste des conversations ──────────────
  listContent: {
    flexGrow: 1,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 22 },
  rowBody: { flex: 1, gap: Spacing.half },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  preview: { flexShrink: 1 },
  time: { marginLeft: Spacing.two },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: Spacing.one,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  separator: { height: 1, marginLeft: 84 },

  // ── États vides / erreur ─────────────────
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    paddingTop: Spacing.six,
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: { textAlign: 'center', lineHeight: 20 },
  errorContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.four, gap: Spacing.two,
  },

  // ── Fil de discussion ────────────────────
  threadContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 18,
  },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: '#208AEF', borderBottomRightRadius: 4 },
  bubbleTheirs: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleTextMine: { color: '#ffffff' },
  bubbleTime: { fontSize: 11, marginTop: Spacing.half },

  // ── Barre de saisie ──────────────────────
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#208AEF',
  },
  sendIcon: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  sendDisabled: { opacity: 0.4 },
});
