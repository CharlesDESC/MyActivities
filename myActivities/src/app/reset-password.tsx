import { Link, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { styles } from '@/styles/app/reset-password';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import { useResetPasswordForm } from '@/hooks/use-reset-password-form';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { values, errors, isSubmitting, done, setField, submit } = useResetPasswordForm();

  if (!token) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedView style={styles.stateBox}>
            <Icon name="error-outline" size={48} color="#EF4444" />
            <ThemedText type="subtitle">Lien invalide</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.stateText}>
              Ce lien de réinitialisation est invalide ou a expiré. Fais une nouvelle demande.
            </ThemedText>
          </ThemedView>
          <Link href="/forgot-password" asChild>
            <Button label="Nouvelle demande" style={styles.stretchButton} />
          </Link>
          <Link href="/login" asChild>
            <ThemedText type="linkPrimary">Retour à la connexion</ThemedText>
          </Link>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (done) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedView style={styles.stateBox}>
            <Icon name="check-circle" size={48} color="#22C55E" />
            <ThemedText type="subtitle">Mot de passe mis à jour</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.stateText}>
              Ton mot de passe a bien été modifié. Tu peux maintenant te connecter.
            </ThemedText>
          </ThemedView>
          <Link href="/login" asChild>
            <Button label="Se connecter" style={styles.stretchButton} />
          </Link>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <ThemedView style={styles.header}>
              <ThemedText type="title">Nouveau{'\n'}mot de passe</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Choisis un mot de passe solide pour sécuriser ton compte.
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.form}>
              {errors.global && (
                <ThemedView type="backgroundElement" style={styles.globalError}>
                  <ThemedText type="small" style={styles.errorText}>
                    {errors.global}
                  </ThemedText>
                </ThemedView>
              )}

              <Input
                label="Nouveau mot de passe"
                placeholder="••••••••"
                value={values.password}
                onChangeText={(v) => setField('password', v)}
                error={errors.password}
                secureTextEntry
                textContentType="newPassword"
                autoComplete="new-password"
              />

              <Input
                label="Confirmer le mot de passe"
                placeholder="••••••••"
                value={values.confirmPassword}
                onChangeText={(v) => setField('confirmPassword', v)}
                error={errors.confirmPassword}
                secureTextEntry
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={() => submit(token)}
              />

              <ThemedText type="small" themeColor="textSecondary">
                Au moins 8 caractères, une majuscule et un chiffre.
              </ThemedText>

              <Button
                label="Réinitialiser le mot de passe"
                onPress={() => submit(token)}
                loading={isSubmitting}
              />
            </ThemedView>

            <ThemedView style={styles.footer}>
              <Link href="/login" asChild>
                <ThemedText type="linkPrimary">Retour à la connexion</ThemedText>
              </Link>
            </ThemedView>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

