import { Stack } from 'expo-router';

// Onglet Messages : la liste (index) est la racine de l'onglet ; le fil de
// discussion ([conversationId]) s'empile par-dessus avec retour natif.
export default function MessagesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
