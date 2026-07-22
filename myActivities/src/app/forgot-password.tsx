import { Link } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { styles } from '@/styles/app/forgot-password';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import { useForgotPasswordForm } from '@/hooks/use-forgot-password-form';

export default function ForgotPasswordScreen() {
  const { values, errors, isSubmitting, sent, setField, submit } = useForgotPasswordForm();

  if (sent) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedView style={styles.successBox}>
            <Icon name="mark-email-read" size={48} color="#208AEF" />
            <ThemedText type="subtitle">Vérifie ta boîte mail</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.successText}>
              Si un compte correspond à{' '}
              <ThemedText type="smallBold">{values.email}</ThemedText>, tu recevras un lien de
              réinitialisation valable 1 heure.
            </ThemedText>
          </ThemedView>

          <Link href="/login" asChild>
            <Button label="Retour à la connexion" style={styles.stretchButton} />
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
              <ThemedText type="title">Mot de passe{'\n'}oublié ?</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
                {"Saisis ton email et on t'envoie un lien pour le réinitialiser."}
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
                label="Email"
                placeholder="ton@email.com"
                value={values.email}
                onChangeText={(v) => setField('email', v)}
                error={errors.email}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="done"
                onSubmitEditing={submit}
              />

              <Button label="Envoyer le lien" onPress={submit} loading={isSubmitting} />
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

