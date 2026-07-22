import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AuthProvider, useAuth } from '@/context/auth';
import { AnimatedSplashOverlay } from '@/components/splash/animated-icon';
import { useRealtime } from '@/hooks/use-realtime';

const AUTH_ROUTES = ['login', 'register', 'forgot-password', 'reset-password'];

function AppNavigator() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  // Une connexion Socket.IO unique pour toute la session. La placer ici évite
  // qu'un changement d'écran déconnecte la socket utilisée par le chat suivant.
  useRealtime();

  useEffect(() => {
    if (isLoading) return;

    const onAuthRoute = AUTH_ROUTES.includes(segments[0] as string);

    if (!user && !onAuthRoute) {
      router.replace('/login');
    } else if (user && onAuthRoute) {
      router.replace('/');
    }
  }, [user, isLoading, segments, router]);

  if (isLoading) return null;

  // Stack racine : les onglets (groupe (tabs)) sont un écran, les fiches
  // détail (activity/[id]) s'empilent par-dessus avec retour natif.
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <AppNavigator />
      </ThemeProvider>
    </AuthProvider>
  );
}
