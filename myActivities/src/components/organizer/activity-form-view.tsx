import { useRef } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { styles } from '@/styles/components/organizer/activity-form';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { TimePicker } from '@/components/ui/time-picker';
import { WebContainer } from '@/components/web/web-container';
import { OrganizerOnly } from '@/components/organizer/organizer-only';
import { useTheme } from '@/hooks/use-theme';
import { useActivityForm } from '@/hooks/use-activity-form';
import { useEstablishment } from '@/hooks/use-establishment';
import { CATEGORY_CONFIG, type ActivityCategory, type ActivityDetail } from '@/types/activity';

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as ActivityCategory[];
const NO_MARKED_DATES = new Set<string>();

export function ActivityFormView({
  activityId,
  initial,
  loading = false,
}: {
  activityId?: string;
  initial?: ActivityDetail | null;
  loading?: boolean;
}) {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const theme = useTheme();
  const { establishment, isLoading: establishmentLoading, error: establishmentError } = useEstablishment();
  const { values, errors, isSubmitting, isDeleting, isEditing, setField, submit, remove } =
    useActivityForm({ activityId, initial });

  async function handleSubmit() {
    try {
      const savedActivity = await submit();
      // Une validation locale invalide renvoie `null` : aucune requête n'est
      // partie et il ne faut surtout pas faire croire à une création réussie.
      if (!savedActivity) {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        return;
      }
      // Cette navigation n'arrive qu'après la résolution du POST/PATCH.
      router.replace('/my-activities');
    } catch {
      // L'erreur détaillée est exposée par le hook ; on la rend immédiatement visible.
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
    }
  }

  // Un accès direct à la page d'édition (refresh web, lien partagé) n'a pas
  // d'historique : `router.back()` échouerait. On retombe alors sur la liste.
  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/my-activities');
  }

  async function performDelete() {
    try {
      await remove();
      router.replace('/my-activities');
    } catch {
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
    }
  }

  function handleDelete() {
    const message =
      `Supprimer définitivement « ${values.name} » ? Ses créneaux et avis seront aussi retirés. Cette action est irréversible.`;

    // Sur web, `Alert.alert` avec boutons ne déclenche pas les callbacks : on
    // passe par la confirmation native du navigateur (même pattern que le logout).
    if (Platform.OS === 'web') {
      if (globalThis.confirm(message)) void performDelete();
      return;
    }

    Alert.alert('Supprimer l’activité', message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => { void performDelete(); } },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <OrganizerOnly>
          <WebContainer>
            <View style={styles.header}>
              <Pressable onPress={handleBack} accessibilityRole="button" accessibilityLabel="Retour">
                <Icon name="arrow-back" size={24} />
              </Pressable>
              <ThemedText type="title" style={styles.title}>
                {isEditing ? 'Modifier l’activité' : 'Nouvelle activité'}
              </ThemedText>
            </View>

            {loading || establishmentLoading ? (
              <ActivityIndicator style={styles.center} />
            ) : establishmentError ? (
              <View style={styles.center}>
                <ThemedText type="small" themeColor="textSecondary">{establishmentError}</ThemedText>
              </View>
            ) : !establishment ? (
              <ThemedView type="backgroundElement" style={styles.establishmentRequired}>
                <Icon name="store" size={32} themeColor="textSecondary" />
                <ThemedText type="subtitle">Établissement requis</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.establishmentRequiredText}>
                  Créez votre fiche établissement avant de proposer une activité.
                </ThemedText>
                <Button label="Créer mon établissement" onPress={() => router.replace('/establishment' as never)} />
              </ThemedView>
            ) : (
              <ScrollView ref={scrollRef} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
                {errors.global && (
                  <ThemedView type="backgroundElement" style={styles.globalError} accessibilityRole="alert">
                    <ThemedText type="small" style={styles.errorText}>{errors.global}</ThemedText>
                  </ThemedView>
                )}

                <ThemedView type="backgroundElement" style={styles.establishmentCard}>
                  <Icon name="store" size={22} themeColor="textSecondary" />
                  <View style={styles.establishmentCardText}>
                    <ThemedText type="smallBold">{establishment.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">{establishment.address}</ThemedText>
                  </View>
                </ThemedView>

                <Input label="Nom" placeholder="Nom de l’activité" value={values.name}
                  onChangeText={(v) => setField('name', v)} error={errors.name} autoCapitalize="sentences" />

                <ThemedText type="smallBold">Catégorie</ThemedText>
                <View style={styles.pills}>
                  {CATEGORIES.map((c) => {
                    const active = values.category === c;
                    return (
                      <Pressable key={c} onPress={() => setField('category', c)}
                        accessibilityRole="button" accessibilityState={{ selected: active }}>
                        <ThemedView type={active ? 'backgroundSelected' : 'backgroundElement'} style={styles.pill}>
                          <ThemedText type="small" themeColor={active ? 'text' : 'textSecondary'}>
                            {CATEGORY_CONFIG[c].label}
                          </ThemedText>
                        </ThemedView>
                      </Pressable>
                    );
                  })}
                </View>

                <Input label="Description" placeholder="Au moins 20 caractères" value={values.description}
                  onChangeText={(v) => setField('description', v)} error={errors.description}
                  multiline numberOfLines={4} style={styles.multiline} autoCapitalize="sentences" />

                {!isEditing && (
                  <ThemedView type="backgroundElement" style={styles.scheduleSection}>
                    <View style={styles.scheduleHeader}>
                      <Icon name="event" size={22} themeColor="textSecondary" />
                      <View style={styles.scheduleHeaderText}>
                        <ThemedText type="smallBold">Date de l’événement</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          Ce créneau sera proposé aux participants.
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.calendarContainer}>
                      <Calendar
                        markedDates={NO_MARKED_DATES}
                        selectedDate={values.eventDate || null}
                        allowAnyFutureDate
                        onSelectDate={(date) => setField('eventDate', date)}
                      />
                    </View>
                    {errors.eventDate && (
                      <ThemedText type="small" style={styles.errorText} accessibilityRole="alert">
                        {errors.eventDate}
                      </ThemedText>
                    )}
                    {values.eventDate && (
                      <View style={styles.scheduleFields}>
                        <View style={styles.scheduleField}>
                          <ThemedText type="smallBold">Heure</ThemedText>
                          <TimePicker
                            value={values.eventTime || null}
                            onChange={(time) => setField('eventTime', time)}
                          />
                          {errors.eventTime && (
                            <ThemedText type="small" style={styles.errorText} accessibilityRole="alert">
                              {errors.eventTime}
                            </ThemedText>
                          )}
                        </View>
                        <Input
                          label="Nombre de places"
                          placeholder="20"
                          value={values.capacity}
                          onChangeText={(value) => setField('capacity', value)}
                          error={errors.capacity}
                          keyboardType="number-pad"
                          style={styles.scheduleField}
                        />
                      </View>
                    )}
                  </ThemedView>
                )}

                <View style={styles.rowFields}>
                  <Input label="Prix min (€)" placeholder="0" value={values.priceMin}
                    onChangeText={(v) => setField('priceMin', v)} error={errors.priceMin}
                    keyboardType="decimal-pad" style={styles.flex} />
                  <Input label="Prix max (€)" placeholder="0" value={values.priceMax}
                    onChangeText={(v) => setField('priceMax', v)} error={errors.priceMax}
                    keyboardType="decimal-pad" style={styles.flex} />
                </View>

                <Input label="Site web (optionnel)" placeholder="https://…" value={values.websiteUrl}
                  onChangeText={(v) => setField('websiteUrl', v)} keyboardType="url" />

                <ThemedText type="smallBold">Accessibilité</ThemedText>
                <View style={styles.toggles}>
                  {([['pmr', 'PMR'], ['stroller', 'Poussette']] as const).map(([key, label]) => (
                    <Pressable key={key} onPress={() => setField(key, !values[key])}
                      accessibilityRole="checkbox" accessibilityState={{ checked: values[key] }}>
                      <ThemedView type="backgroundElement" style={styles.toggle}>
                        <View style={[styles.checkbox, { borderColor: theme.textSecondary }, values[key] && styles.checkboxOn]}>
                          {values[key] && <Icon name="check" size={14} color="#ffffff" />}
                        </View>
                        <ThemedText type="small">{label}</ThemedText>
                      </ThemedView>
                    </Pressable>
                  ))}
                </View>

                <Button label={isEditing ? 'Enregistrer' : 'Créer l’activité'} onPress={handleSubmit}
                  loading={isSubmitting} style={styles.submit} />

                {isEditing && (
                  <Button label="Supprimer l’activité" variant="danger" onPress={handleDelete}
                    loading={isDeleting} disabled={isSubmitting} style={styles.delete} />
                )}
              </ScrollView>
            )}
          </WebContainer>
        </OrganizerOnly>
      </SafeAreaView>
    </ThemedView>
  );
}
