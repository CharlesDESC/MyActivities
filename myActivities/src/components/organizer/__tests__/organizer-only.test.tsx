import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { OrganizerOnly } from '@/components/organizer/organizer-only';

let mockRole: 'member' | 'organizer' | 'admin' | null = 'member';
jest.mock('@/context/auth', () => ({
  useAuth: () => ({
    user: mockRole ? { id: 'u1', email: 'u@example.com', pseudo: 'User', role: mockRole } : null,
  }),
}));

describe('OrganizerOnly', () => {
  it.each([null, 'member'] as const)('denies access to role %s', async (role) => {
    mockRole = role;
    await render(<OrganizerOnly><Text>Contenu privé</Text></OrganizerOnly>);

    expect(screen.getByText('Espace organisateur')).toBeTruthy();
    expect(screen.queryByText('Contenu privé')).toBeNull();
  });

  it.each(['organizer', 'admin'] as const)('renders children for %s', async (role) => {
    mockRole = role;
    await render(<OrganizerOnly><Text>Contenu privé</Text></OrganizerOnly>);

    expect(screen.getByText('Contenu privé')).toBeTruthy();
    expect(screen.queryByText('Espace organisateur')).toBeNull();
  });
});
