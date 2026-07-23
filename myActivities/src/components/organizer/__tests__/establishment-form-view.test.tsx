import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { EstablishmentFormView } from '@/components/organizer/establishment-form-view';
import { useEstablishment } from '@/hooks/use-establishment';
import { useEstablishmentForm } from '@/hooks/use-establishment-form';

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
jest.mock('@/hooks/use-establishment', () => ({ useEstablishment: jest.fn() }));
jest.mock('@/hooks/use-establishment-form', () => ({ useEstablishmentForm: jest.fn() }));

const mockUseEstablishment = useEstablishment as jest.Mock;
const mockUseForm = useEstablishmentForm as jest.Mock;
const mockRefresh = jest.fn();
const mockSetField = jest.fn();
const mockSearchAddress = jest.fn();
const mockSelectAddress = jest.fn();
const mockSubmit = jest.fn();

const suggestion = {
  addressId: 'ban-address-123',
  address: '12 rue de la République, 69001 Lyon',
  latitude: 45.767,
  longitude: 4.835,
};

function useEstablishmentState(overrides: Record<string, unknown> = {}) {
  mockUseEstablishment.mockReturnValue({
    establishment: null,
    isLoading: false,
    error: null,
    refresh: mockRefresh,
    ...overrides,
  });
}

function useFormState(overrides: Record<string, unknown> = {}) {
  mockUseForm.mockReturnValue({
    values: { name: 'Atelier', addressQuery: '12 rue', phone: '', websiteUrl: '' },
    selectedAddress: suggestion,
    suggestions: [],
    errors: {},
    isSearching: false,
    isSubmitting: false,
    isEditing: false,
    setField: mockSetField,
    searchAddress: mockSearchAddress,
    selectAddress: mockSelectAddress,
    submit: mockSubmit,
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  useEstablishmentState();
  useFormState();
  mockSubmit.mockResolvedValue({ id: 'est-1' });
});

describe('EstablishmentFormView', () => {
  it('renders the onboarding form', async () => {
    await render(<EstablishmentFormView />);
    expect(screen.getAllByText('Créer mon établissement')).toHaveLength(2);
    expect(screen.getByText('Adresse confirmée')).toBeTruthy();
  });

  it('forwards field changes and address search', async () => {
    await render(<EstablishmentFormView />);
    await fireEvent.changeText(screen.getByLabelText('Nom de l’établissement'), 'Nouveau nom');
    await fireEvent.press(screen.getByText('Rechercher l’adresse'));
    expect(mockSetField).toHaveBeenCalledWith('name', 'Nouveau nom');
    expect(mockSearchAddress).toHaveBeenCalledTimes(1);
  });

  it('lets the organizer select an IGN suggestion', async () => {
    useFormState({ selectedAddress: null, suggestions: [suggestion] });
    await render(<EstablishmentFormView />);
    await fireEvent.press(screen.getByLabelText(`Choisir ${suggestion.address}`));
    expect(mockSelectAddress).toHaveBeenCalledWith(suggestion);
    expect(screen.getByText('Adresses fournies par cartes.gouv.fr (IGN)')).toBeTruthy();
  });

  it('submits then opens the dashboard', async () => {
    await render(<EstablishmentFormView />);
    await fireEvent.press(screen.getByLabelText('Créer mon établissement'));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });

  it('renders edit mode and navigates back', async () => {
    useEstablishmentState({ establishment: { id: 'est-1' } });
    useFormState({ isEditing: true });
    await render(<EstablishmentFormView />);
    await fireEvent.press(screen.getByLabelText('Retour'));
    expect(screen.getByText('Mon établissement')).toBeTruthy();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('renders loading and API error states', async () => {
    useEstablishmentState({ isLoading: true });
    await render(<EstablishmentFormView />);
    expect(screen.queryByLabelText('Nom de l’établissement')).toBeNull();

    useEstablishmentState({ isLoading: false, error: 'API indisponible' });
    await render(<EstablishmentFormView />);
    await fireEvent.press(screen.getByText('Réessayer'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
