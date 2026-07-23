import { Alert, Platform } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ActivityFormView } from '@/components/organizer/activity-form-view';
import { useActivityForm, type ActivityFormState } from '@/hooks/use-activity-form';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: mockCanGoBack }),
}));

jest.mock('@/components/organizer/organizer-only', () => ({
  OrganizerOnly: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/web/web-container', () => ({
  WebContainer: ({ children }: { children: React.ReactNode }) => children,
}));

// Le calendrier et le sélecteur natif ont leurs propres tests. Les neutraliser
// ici garde ce test centré sur l'orchestration du formulaire et évite un rendu coûteux.
jest.mock('@/components/ui/calendar', () => ({ Calendar: () => null }));
jest.mock('@/components/ui/time-picker', () => ({ TimePicker: () => null }));

jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => ({ textSecondary: '#666666' }),
}));

jest.mock('@/hooks/use-activity-form', () => ({ useActivityForm: jest.fn() }));
jest.mock('@/hooks/use-establishment', () => ({
  useEstablishment: () => ({
    establishment: {
      id: 'est-1',
      name: 'Atelier des quais',
      address: '10 rue des Arts, Paris',
    },
    isLoading: false,
    error: null,
  }),
}));

const mockUseActivityForm = useActivityForm as jest.Mock;
const mockSetField = jest.fn();
const mockSubmit = jest.fn();
const mockRemove = jest.fn();

// `confirm` n'existe pas dans l'environnement de test Node : on l'installe le
// temps des tests web puis on le retire (afterEach) pour ne pas fuir sur les
// tests natifs.
const originalConfirm = globalThis.confirm;
function setWebConfirm(accepted: boolean) {
  Object.defineProperty(globalThis, 'confirm', {
    value: jest.fn().mockReturnValue(accepted),
    configurable: true,
  });
}
afterEach(() => {
  Object.defineProperty(globalThis, 'confirm', { value: originalConfirm, configurable: true });
});

const VALUES: ActivityFormState = {
  name: 'Atelier poterie',
  category: 'art',
  description: 'Une description suffisamment longue.',
  priceMin: '15',
  priceMax: '30',
  websiteUrl: '',
  eventDate: '2099-08-15',
  eventTime: '10:30',
  capacity: '20',
  pmr: false,
  stroller: true,
};

function useForm(overrides: Record<string, unknown> = {}) {
  mockUseActivityForm.mockReturnValue({
    values: VALUES,
    errors: {},
    isSubmitting: false,
    isDeleting: false,
    isEditing: false,
    setField: mockSetField,
    submit: mockSubmit,
    remove: mockRemove,
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSubmit.mockResolvedValue({ id: 'act-1' });
  mockRemove.mockResolvedValue(true);
  mockCanGoBack.mockReturnValue(true);
  useForm();
});

describe('ActivityFormView', () => {
  it('renders the create form and forwards its options to the hook', async () => {
    await render(<ActivityFormView activityId="act-1" initial={null} />);

    expect(screen.getByText('Nouvelle activité')).toBeTruthy();
    expect(screen.getByDisplayValue('Atelier poterie')).toBeTruthy();
    expect(mockUseActivityForm).toHaveBeenCalledWith({ activityId: 'act-1', initial: null });
  });

  it('renders the edit title and global error', async () => {
    useForm({ isEditing: true, errors: { global: 'Enregistrement impossible' } });
    await render(<ActivityFormView />);

    expect(screen.getByText('Modifier l’activité')).toBeTruthy();
    expect(screen.getByText('Enregistrement impossible')).toBeTruthy();
    expect(screen.getByText('Enregistrer')).toBeTruthy();
  });

  it('renders a loading indicator instead of the form', async () => {
    await render(<ActivityFormView loading />);
    expect(screen.queryByDisplayValue('Atelier poterie')).toBeNull();
  });

  it('updates text, category and accessibility fields', async () => {
    await render(<ActivityFormView />);

    await fireEvent.changeText(screen.getByLabelText('Nom'), 'Nouveau nom');
    await fireEvent.press(screen.getByText(/Sport/));
    await fireEvent.press(screen.getByText('PMR'));
    await fireEvent.press(screen.getByText('Poussette'));

    expect(mockSetField).toHaveBeenCalledWith('name', 'Nouveau nom');
    expect(mockSetField).toHaveBeenCalledWith('category', 'sport');
    expect(mockSetField).toHaveBeenCalledWith('pmr', true);
    expect(mockSetField).toHaveBeenCalledWith('stroller', false);
  });

  it('navigates back from the header when history exists', async () => {
    mockCanGoBack.mockReturnValue(true);
    await render(<ActivityFormView />);
    await fireEvent.press(screen.getByLabelText('Retour'));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('falls back to the activity list when there is no history (direct load / refresh)', async () => {
    mockCanGoBack.mockReturnValue(false);
    await render(<ActivityFormView />);
    await fireEvent.press(screen.getByLabelText('Retour'));
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/my-activities');
  });

  it('submits then returns to the activity list', async () => {
    await render(<ActivityFormView />);
    await fireEvent.press(screen.getByText('Créer l’activité'));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    expect(mockReplace).toHaveBeenCalledWith('/my-activities');
  });

  it('stays on the form when submission fails', async () => {
    mockSubmit.mockRejectedValue(new Error('offline'));
    await render(<ActivityFormView />);
    await fireEvent.press(screen.getByText('Créer l’activité'));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('stays on the form when local validation prevents submission', async () => {
    mockSubmit.mockResolvedValue(null);
    await render(<ActivityFormView />);
    await fireEvent.press(screen.getByText('Créer l’activité'));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('passes the submitting state to the button', async () => {
    useForm({ isSubmitting: true });
    await render(<ActivityFormView />);
    expect(screen.queryByText('Créer l’activité')).toBeNull();
  });

  it('does not offer deletion when creating an activity', async () => {
    await render(<ActivityFormView />);
    expect(screen.queryByText('Supprimer l’activité')).toBeNull();
  });

  it('deletes after confirmation then returns to the activity list', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    useForm({ isEditing: true });
    await render(<ActivityFormView />);

    await fireEvent.press(screen.getByText('Supprimer l’activité'));

    await waitFor(() => expect(mockRemove).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/my-activities'));
    alertSpy.mockRestore();
  });

  it('uses the browser confirm on web and deletes when accepted', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const alertSpy = jest.spyOn(Alert, 'alert');
    setWebConfirm(true);
    useForm({ isEditing: true });
    await render(<ActivityFormView />);

    await fireEvent.press(screen.getByText('Supprimer l’activité'));

    await waitFor(() => expect(mockRemove).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/my-activities'));
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('does not delete on web when the confirm is dismissed', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    setWebConfirm(false);
    useForm({ isEditing: true });
    await render(<ActivityFormView />);

    await fireEvent.press(screen.getByText('Supprimer l’activité'));

    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('stays on the form when deletion fails', async () => {
    mockRemove.mockRejectedValue(new Error('offline'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    useForm({ isEditing: true });
    await render(<ActivityFormView />);

    await fireEvent.press(screen.getByText('Supprimer l’activité'));

    await waitFor(() => expect(mockRemove).toHaveBeenCalledTimes(1));
    expect(mockReplace).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
