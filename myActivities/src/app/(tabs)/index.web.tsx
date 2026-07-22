import { Redirect } from 'expo-router';

// Sur le web (espace organisateur), la racine renvoie vers le tableau de bord.
export default function WebHomeRedirect() {
  return <Redirect href="/dashboard" />;
}
