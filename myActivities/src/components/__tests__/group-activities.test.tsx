import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { GroupActivities } from '@/components/group-activities';
import { useGroupActivities } from '@/hooks/use-group-activities';
import { ApiError } from '@/lib/api';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/hooks/use-group-activities', () => ({ useGroupActivities: jest.fn() }));
jest.mock('@/context/auth', () => ({ useAuth: () => ({ user: { id: 'u' } }) }));
const useGroup = useGroupActivities as jest.Mock;
const change = jest.fn();
const search = jest.fn();
const refresh = jest.fn();
const loadMore = jest.fn();
const own = { id: 'a', name: 'Bowling', available: true, addedBy: 'u', addedByPseudo: 'Alice' };
const other = { id: 'b', name: 'Musée', available: true, addedBy: 'v', addedByPseudo: 'Bob' };
let state: Record<string, unknown>;
beforeEach(() => {
  jest.clearAllMocks();
  change.mockResolvedValue(true);
  search.mockResolvedValue({ data: [{ id: 'c', name: 'Piscine', address: 'Paris' }], hasMore: false });
  state = { conversation: { type: 'group', title: 'Amis', participants: [{ id: 'u', role: 'member' }] },
    activities: [own, other], loading: false, busy: false, error: null, hasMore: false,
    change, search, refresh, loadMore };
  useGroup.mockImplementation(() => state);
});
async function open() {
  await render(<GroupActivities conversationId="g" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Activités du groupe' }));
}
it('allows a member to propose an activity from search', async () => {
  await open();
  await fireEvent.press(screen.getByRole('button', { name: 'Proposer une activité' }));
  await waitFor(() => expect(screen.getByText('Piscine')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Rechercher une activité'), 'Piscine');
  await fireEvent.press(screen.getByRole('button', { name: 'Rechercher' }));
  expect(search).toHaveBeenLastCalledWith('Piscine', 1);
  await fireEvent.press(screen.getByRole('button', { name: 'Proposer Piscine' }));
  expect(change).toHaveBeenCalledWith('c');
  expect(screen.queryByLabelText('Rechercher une activité')).toBeNull();
});
it('shows authors and only allows a member to remove their own proposals', async () => {
  await open();
  expect(screen.getByText('Proposée par Bob')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Retirer Musée' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Retirer Bowling' }));
  expect(change).toHaveBeenCalledWith('a', true);
});
it('allows group admins to remove any proposal', async () => {
  state.conversation = { type: 'group', participants: [{ id: 'u', role: 'admin' }] };
  await open();
  await fireEvent.press(screen.getByRole('button', { name: 'Retirer Musée' }));
  expect(change).toHaveBeenCalledWith('b', true);
});
it('opens an activity detail from the group', async () => {
  await open();
  await fireEvent.press(screen.getByRole('button', { name: 'Voir Bowling' }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/activity/[id]', params: { id: 'a' } });
});
it('does not offer a detail link for an unavailable activity', async () => {
  state.activities = [{ ...own, name: 'Activité indisponible', available: false, addedByPseudo: null }];
  await open();
  expect(screen.getByText('Proposée par un ancien membre')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Voir Activité indisponible' })).toBeNull();
});
it('hides the feature for direct conversations', async () => {
  state.conversation = { type: 'direct', participants: [] };
  await render(<GroupActivities conversationId="d" />);
  expect(screen.queryByRole('button', { name: 'Activités du groupe' })).toBeNull();
});
it('offers a retry after a failed initial load', async () => {
  state.conversation = null;
  state.error = 'Accès indisponible';
  await render(<GroupActivities conversationId="g" />);
  expect(screen.getByRole('alert')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Réessayer le chargement du groupe' }));
  expect(refresh).toHaveBeenCalled();
});
it('handles empty groups and failed searches without closing the picker', async () => {
  state.activities = [];
  search.mockRejectedValue(new ApiError('Réseau indisponible', 503));
  await open();
  expect(screen.getByText('Aucune activité proposée.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Proposer une activité' }));
  await waitFor(() => expect(screen.getByText('Réseau indisponible')).toBeTruthy());
  search.mockResolvedValue({ data: [], hasMore: false });
  await fireEvent.press(screen.getByRole('button', { name: 'Rechercher' }));
  await waitFor(() => expect(screen.getByText('Aucune activité à afficher. Essayez une autre recherche.')).toBeTruthy());
});
it('keeps the picker available when adding fails', async () => {
  change.mockResolvedValue(false);
  await open();
  await fireEvent.press(screen.getByRole('button', { name: 'Proposer une activité' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Proposer Piscine' }));
  expect(screen.getByLabelText('Rechercher une activité')).toBeTruthy();
});
it('loads more proposals and search results', async () => {
  state.hasMore = true;
  search.mockResolvedValueOnce({ data: [{ id: 'c', name: 'Piscine', address: 'Paris' }], hasMore: true })
    .mockResolvedValueOnce({ data: [{ id: 'd', name: 'Tennis', address: 'Lyon' }], hasMore: false });
  await open();
  await fireEvent.press(screen.getByRole('button', { name: 'Plus de propositions' }));
  expect(loadMore).toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Proposer une activité' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Plus de résultats' }));
  expect(search).toHaveBeenLastCalledWith('', 2);
  expect(screen.getByText('Piscine')).toBeTruthy();
  expect(screen.getByText('Tennis')).toBeTruthy();
});
it('disables write actions while saving', async () => {
  state.busy = true;
  await open();
  await fireEvent.press(screen.getByRole('button', { name: 'Retirer Bowling' }));
  expect(change).not.toHaveBeenCalled();
});
it('ignores a search response after changing its input', async () => {
  let resolve!: (data: unknown) => void;
  search.mockReturnValue(new Promise((r) => { resolve = r; }));
  await open();
  await fireEvent.press(screen.getByRole('button', { name: 'Proposer une activité' }));
  await fireEvent.changeText(screen.getByLabelText('Rechercher une activité'), 'Tennis');
  await act(async () => { resolve({ data: [{ id: 'c', name: 'Piscine' }], hasMore: false }); });
  expect(screen.queryByText('Piscine')).toBeNull();
});
