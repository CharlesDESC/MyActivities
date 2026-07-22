import { useColorScheme } from '@/hooks/use-color-scheme';
import { useColorScheme as rnUseColorScheme } from 'react-native';

describe('useColorScheme', () => {
  it('re-exports the React Native hook', () => {
    expect(useColorScheme).toBe(rnUseColorScheme);
  });
});
