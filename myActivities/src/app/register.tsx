import { Link } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { styles } from '@/styles/app/register';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { useRegisterForm } from '@/hooks/use-register-form';

const IS_WEB = Platform.OS === 'web';

export default function RegisterScreen() {
  const { values, errors, isSubmitting, registered, setField, submit } = useRegisterForm();

  if (registered) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedView style={styles.successBox}>
            <Icon name="mark-email-read" size={48} color="#208AEF" />
            <ThemedText type="subtitle">Vérifie ta boîte mail</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.successText}>
              {"Un lien de confirmation t'a été envoyé à "}
              <ThemedText type="smallBold">{values.email}</ThemedText>. Active ton compte avant de
              te connecter.
            </ThemedText>
          </ThemedView>

          <Link href="/login" asChild>
            <Button label="Aller à la connexion" style={styles.loginButton} />
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
              <ThemedText type="title">{IS_WEB ? 'Espace organisateur' : 'Créer un compte'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {IS_WEB
                  ? 'Créez votre compte organisateur pour publier vos activités'
                  : 'Rejoins la communauté MyActivities'}
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
              />

              <Input
                label="Pseudo"
                placeholder="monpseudo"
                value={values.pseudo}
                onChangeText={(v) => setField('pseudo', v)}
                error={errors.pseudo}
                textContentType="username"
                autoComplete="username-new"
              />

              <Input
                label="Mot de passe"
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
                onSubmitEditing={submit}
              />

              <ThemedText type="small" themeColor="textSecondary">
                Au moins 8 caractères, une majuscule et un chiffre.
              </ThemedText>

              {IS_WEB && (
                <Input
                  label="SIRET"
                  placeholder="14 chiffres"
                  value={values.siret}
                  onChangeText={(v) => setField('siret', v.replace(/\D/g, '').slice(0, 14))}
                  error={errors.siret}
                  keyboardType="number-pad"
                  maxLength={14}
                />
              )}

              <Button label="Créer mon compte" onPress={submit} loading={isSubmitting} />
            </ThemedView>

            <ThemedView style={styles.footer}>
              <ThemedText type="small" themeColor="textSecondary">
                Déjà un compte ?{' '}
              </ThemedText>
              <Link href="/login" asChild>
                <ThemedText type="linkPrimary">Se connecter</ThemedText>
              </Link>
            </ThemedView>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

