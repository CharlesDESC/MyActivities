import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ActivityFormView } from '@/components/organizer/activity-form-view';
import { useActivityForm, type ActivityFormState } from '@/hooks/use-activity-form';

const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
}));

jest.mock('@/components/organizer/organizer-only', () => ({
  OrganizerOnly: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/web/web-container', () => ({
  WebContainer: ({ children }: { children: React.ReactNode }) => children,
}));

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

const VALUES: ActivityFormState = {
  name: 'Atelier poterie',
  category: 'art',
  description: 'Une description suffisamment longue.',
  priceMin: '15',
  priceMax: '30',
  websiteUrl: '',
  pmr: false,
  stroller: true,
};

function useForm(overrides: Record<string, unknown> = {}) {
  mockUseActivityForm.mockReturnValue({
    values: VALUES,
    errors: {},
    isSubmitting: false,
    isEditing: false,
    setField: mockSetField,
    submit: mockSubmit,
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSubmit.mockResolvedValue({ id: 'act-1' });
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

  it('navigates back from the header', async () => {
    await render(<ActivityFormView />);
    await fireEvent.press(screen.getByLabelText('Retour'));
    expect(mockBack).toHaveBeenCalledTimes(1);
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

  it('passes the submitting state to the button', async () => {
    useForm({ isSubmitting: true });
    await render(<ActivityFormView />);
    expect(screen.queryByText('Créer l’activité')).toBeNull();
  });
});
