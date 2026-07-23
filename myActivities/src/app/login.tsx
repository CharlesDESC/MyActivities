import { Link } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { styles } from '@/styles/app/login';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { useLoginForm } from '@/hooks/use-login-form';

export default function LoginScreen() {
  const { values, errors, isSubmitting, setField, submit } = useLoginForm();

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
              <ThemedText type="title">Connexion</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Bon retour sur MyActivities
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.form}>
              {errors.global && (
                <ThemedView
                  type="background"
                  style={styles.globalError}
                  accessibilityRole="alert">
                  <ThemedText type="small" style={styles.errorText}>
                    {errors.global}
                  </ThemedText>
                </ThemedView>
              )}

              <Input
                label="Pseudo"
                placeholder="monpseudo"
                value={values.pseudo}
                onChangeText={(v) => setField('pseudo', v)}
                error={errors.pseudo}
                textContentType="username"
                autoComplete="username"
              />

              <Input
                label="Mot de passe"
                placeholder="••••••••"
                value={values.password}
                onChangeText={(v) => setField('password', v)}
                error={errors.password}
                secureTextEntry
                textContentType="password"
                autoComplete="current-password"
                returnKeyType="done"
                onSubmitEditing={submit}
              />

              <Link href="/forgot-password" asChild>
                <ThemedText type="linkPrimary" style={styles.forgotLink}>
                  Mot de passe oublié ?
                </ThemedText>
              </Link>

              <Button label="Se connecter" onPress={submit} loading={isSubmitting} />
            </ThemedView>

            <ThemedView style={styles.footer}>
              <ThemedText type="small" themeColor="textSecondary">
                Pas encore de compte ?{' '}
              </ThemedText>
              <Link href="/register" asChild>
                <ThemedText type="linkPrimary">Créer un compte</ThemedText>
              </Link>
            </ThemedView>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
