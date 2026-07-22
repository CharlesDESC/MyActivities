import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { OrganizerOnly } from '@/components/organizer/organizer-only';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { WebContainer } from '@/components/web/web-container';
import { useEstablishment } from '@/hooks/use-establishment';
import { useEstablishmentForm } from '@/hooks/use-establishment-form';
import { styles } from '@/styles/components/organizer/establishment-form';
import type { Establishment } from '@/types/establishment';

function EstablishmentForm({ initial }: { initial: Establishment | null }) {
  const router = useRouter();
  const form = useEstablishmentForm(initial);

  async function handleSubmit() {
    try {
      const saved = await form.submit();
      if (saved) router.replace('/dashboard');
    } catch {
      // Le hook expose le message dans errors.global.
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        {initial && (
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour">
            <Icon name="arrow-back" size={24} />
          </Pressable>
        )}
        <View style={styles.headerText}>
          <ThemedText type="title">
            {form.isEditing ? 'Mon établissement' : 'Créer mon établissement'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Cette adresse sera réutilisée automatiquement pour toutes vos activités.
          </ThemedText>
        </View>
      </View>

      {form.errors.global && (
        <ThemedView type="backgroundElement" style={styles.globalError}>
          <ThemedText type="small" style={styles.errorText}>{form.errors.global}</ThemedText>
        </ThemedView>
      )}

      <Input
        label="Nom de l’établissement"
        placeholder="Ex. Atelier des quais"
        value={form.values.name}
        onChangeText={(value) => form.setField('name', value)}
        error={form.errors.name}
        autoCapitalize="words"
      />

      <View style={styles.addressBlock}>
        <Input
          label="Adresse"
          placeholder="12 rue de la République, Lyon"
          value={form.values.addressQuery}
          onChangeText={(value) => form.setField('addressQuery', value)}
          onSubmitEditing={form.searchAddress}
          error={form.errors.address}
          autoCapitalize="words"
          returnKeyType="search"
        />
        <Button
          label="Rechercher l’adresse"
          variant="ghost"
          onPress={form.searchAddress}
          loading={form.isSearching}
        />
      </View>

      {form.suggestions.length > 0 && (
        <ThemedView type="backgroundElement" style={styles.suggestions}>
          {form.suggestions.map((suggestion) => (
            <Pressable
              key={suggestion.mapboxId}
              onPress={() => form.selectAddress(suggestion)}
              accessibilityRole="button"
              accessibilityLabel={`Choisir ${suggestion.address}`}
              style={styles.suggestion}>
              <Icon name="location-on" size={20} themeColor="textSecondary" />
              <ThemedText type="small" style={styles.suggestionText}>{suggestion.address}</ThemedText>
            </Pressable>
          ))}
          <ThemedText type="small" themeColor="textSecondary" style={styles.attribution}>
            Adresses fournies par Mapbox
          </ThemedText>
        </ThemedView>
      )}

      {form.selectedAddress && (
        <ThemedView type="backgroundElement" style={styles.selectedAddress}>
          <Icon name="check-circle" size={20} color="#22C55E" />
          <View style={styles.selectedAddressText}>
            <ThemedText type="smallBold">Adresse confirmée</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {form.selectedAddress.address}
            </ThemedText>
          </View>
        </ThemedView>
      )}

      <Input
        label="Téléphone (optionnel)"
        placeholder="04 00 00 00 00"
        value={form.values.phone}
        onChangeText={(value) => form.setField('phone', value)}
        keyboardType="phone-pad"
      />
      <Input
        label="Site web (optionnel)"
        placeholder="https://example.fr"
        value={form.values.websiteUrl}
        onChangeText={(value) => form.setField('websiteUrl', value)}
        error={form.errors.websiteUrl}
        keyboardType="url"
      />

      <Button
        label={form.isEditing ? 'Enregistrer les modifications' : 'Créer mon établissement'}
        onPress={handleSubmit}
        loading={form.isSubmitting}
        style={styles.submit}
      />
    </ScrollView>
  );
}

export function EstablishmentFormView() {
  const { establishment, isLoading, error, refresh } = useEstablishment();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <OrganizerOnly>
          <WebContainer>
            {isLoading ? (
              <ActivityIndicator style={styles.center} />
            ) : error ? (
              <View style={styles.center}>
                <ThemedText type="small" themeColor="textSecondary">{error}</ThemedText>
                <Button label="Réessayer" variant="ghost" onPress={refresh} />
              </View>
            ) : (
              <EstablishmentForm initial={establishment} />
            )}
          </WebContainer>
        </OrganizerOnly>
      </SafeAreaView>
    </ThemedView>
  );
}
