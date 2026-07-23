import { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable,
  ScrollView, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { styles } from '@/styles/app/activity-detail';
import { Button } from '@/components/ui/button';
import { Calendar, toDateKey } from '@/components/ui/calendar';
import { StarRating } from '@/components/ui/star-rating';
import { TimePicker } from '@/components/ui/time-picker';
import { Icon } from '@/components/ui/icon';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { getApiErrorMessage } from '@/lib/api';
import { combineLocalDateAndTime } from '@/lib/scheduling';
import { useActivityDetail } from '@/hooks/use-activity-detail';
import { useActivitySlots } from '@/hooks/use-activity-slots';
import { usePlanning } from '@/hooks/use-planning';
import { useReview } from '@/hooks/use-review';
import { CATEGORY_CONFIG, type ActivitySlot } from '@/types/activity';
import { useTheme } from '@/hooks/use-theme';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

const DAY_ORDER = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

// Trie les jours dans l'ordre de la semaine (les clés JSON arrivent sans ordre garanti)
function orderDays(hours: Record<string, string>): [string, string][] {
  return Object.entries(hours).sort(
    ([a], [b]) => DAY_ORDER.indexOf(a.toLowerCase()) - DAY_ORDER.indexOf(b.toLowerCase()),
  );
}

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const { activity, reviews, isLoading, error } = useActivityDetail(id);
  const { slots, isLoading: slotsLoading, refetch: refetchSlots } = useActivitySlots(id);
  const { addToPlanning } = usePlanning();

  const [showPlanningForm, setShowPlanningForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [planningLoading, setPlanningLoading] = useState(false);

  // Créneaux groupés par jour (clé YYYY-MM-DD locale) pour le calendrier
  const slotsByDate = useMemo(() => {
    const map = new Map<string, ActivitySlot[]>();
    for (const slot of slots) {
      const key = toDateKey(new Date(slot.startsAt));
      map.set(key, [...(map.get(key) ?? []), slot]);
    }
    return map;
  }, [slots]);

  const hasSlots = slots.length > 0;
  const markedDates = useMemo(() => new Set(slotsByDate.keys()), [slotsByDate]);

  const [pendingRating, setPendingRating] = useState(0);
  const { submitRating, isSubmitting: ratingSubmitting } = useReview(id, () => {
    setPendingRating(0);
    Alert.alert('Merci !', 'Ton avis a été publié.');
  });

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (error || !activity) {
    return (
      <ThemedView style={styles.errorContainer}>
        <Icon name="error-outline" size={40} themeColor="textSecondary" />
        <ThemedText type="subtitle">Activité introuvable</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{error}</ThemedText>
        <Button label="Retour" variant="ghost" onPress={() => router.back()} />
      </ThemedView>
    );
  }

  const cfg = CATEGORY_CONFIG[activity.category];

  const priceLabel =
    activity.priceMin === 0 && activity.priceMax === 0
      ? 'Gratuit'
      : activity.priceMin === activity.priceMax
        ? `${activity.priceMin} €`
        : `${activity.priceMin} – ${activity.priceMax} €`;

  function closePlanningForm() {
    setShowPlanningForm(false);
    setSelectedDate(null);
    setSelectedTime(null);
    setSelectedSlotId(null);
  }

  async function handleAddToPlanning() {
    if (hasSlots && !selectedSlotId) {
      Alert.alert('Créneau requis', 'Choisis un jour dans le calendrier, puis un créneau.');
      return;
    }
    if (!hasSlots && (!selectedDate || !selectedTime)) {
      Alert.alert('Créneau requis', 'Choisis une date puis une heure.');
      return;
    }

    const scheduledAt = !hasSlots
      ? combineLocalDateAndTime(selectedDate!, selectedTime!)
      : null;
    if (!hasSlots && (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now())) {
      Alert.alert('Créneau invalide', 'Choisis une date et une heure dans le futur.');
      return;
    }

    setPlanningLoading(true);
    try {
      await addToPlanning(
        activity!.id,
        hasSlots ? { slotId: selectedSlotId! } : { scheduledAt: scheduledAt! },
      );
      closePlanningForm();
      await refetchSlots();
      Alert.alert('Réservé !', hasSlots
        ? 'Ton créneau est réservé et ajouté à ton planning.'
        : 'Activité ajoutée à ton planning.');
    } catch (err) {
      // Messages API explicites : créneau complet, déjà réservé…
      Alert.alert('Erreur', getApiErrorMessage(err, 'Impossible d\'ajouter au planning.'));
      await refetchSlots();
    } finally {
      setPlanningLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>

          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            style={{ padding: Spacing.three }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="arrow-back" size={18} />
              <ThemedText type="small">Retour</ThemedText>
            </View>
          </Pressable>

          {/* Hero */}
          <View style={[styles.hero, { backgroundColor: cfg.color + '22' }]}>
            <Icon name={cfg.icon} size={64} color={cfg.color} />
          </View>

          {/* Body */}
          <View style={styles.body}>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.categoryRow}>
                <ThemedText type="small" themeColor="textSecondary" style={{ fontWeight: '600' }}>
                  {cfg.label}
                </ThemedText>
                {reviews && reviews.avgRating !== null && (
                  <StarRating value={reviews.avgRating} size="small" />
                )}
                {reviews && (
                  <ThemedText type="small" themeColor="textSecondary">
                    ({reviews.reviewCount})
                  </ThemedText>
                )}
              </View>
              <ThemedText type="subtitle">{activity.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{activity.address}</ThemedText>
            </View>

            {/* Meta chips */}
            <View style={styles.metaRow}>
              <ThemedView type="backgroundElement" style={styles.metaChip}>
                <Icon name="payments" size={15} themeColor="textSecondary" />
                <ThemedText type="small">{priceLabel}</ThemedText>
              </ThemedView>
              {activity.accessibilityPmr && (
                <ThemedView type="backgroundElement" style={styles.metaChip}>
                  <Icon name="accessible" size={15} themeColor="text" />
                  <ThemedText type="small">PMR</ThemedText>
                </ThemedView>
              )}
              {activity.accessibilityStroller && (
                <ThemedView type="backgroundElement" style={styles.metaChip}>
                  <Icon name="child-friendly" size={15} themeColor="text" />
                  <ThemedText type="small">Poussette</ThemedText>
                </ThemedView>
              )}
            </View>

            <View style={[styles.divider, { backgroundColor: theme.backgroundElement }]} />

            {/* Description */}
            <View style={styles.section}>
              <ThemedText type="smallBold">Description</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ lineHeight: 20 }}>
                {activity.description}
              </ThemedText>
            </View>

            {/* Opening hours */}
            {activity.openingHours && Object.keys(activity.openingHours).length > 0 && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.backgroundElement }]} />
                <View style={styles.section}>
                  <ThemedText type="smallBold">Horaires</ThemedText>
                  {orderDays(activity.openingHours).map(([day, hours]) => (
                    <View key={day} style={styles.hoursRow}>
                      <ThemedText type="small" style={{ textTransform: 'capitalize' }}>
                        {day}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {hours}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Organizer */}
            <View style={[styles.divider, { backgroundColor: theme.backgroundElement }]} />
            <View style={styles.section}>
              <ThemedText type="smallBold">Organisateur</ThemedText>
              <View style={styles.organizerRow}>
                <View style={[styles.organizerAvatar, { backgroundColor: cfg.color + '33' }]}>
                  <Icon name="account-circle" size={20} themeColor="textSecondary" />
                </View>
                <ThemedText type="small">{activity.organizer.pseudo}</ThemedText>
              </View>
              {/* Contacter l'organisateur (pas soi-même) → ouvre une conversation neuve */}
              {user && user.id !== activity.organizer.id && (
                <Button
                  label="Contacter l'organisateur"
                  variant="ghost"
                  style={{ marginTop: Spacing.two }}
                  onPress={() =>
                    router.push({
                      pathname: '/messages/[conversationId]',
                      params: {
                        conversationId: 'new',
                        recipientId: activity!.organizer.id,
                        peerPseudo: activity!.organizer.pseudo,
                      },
                    })
                  }
                />
              )}
            </View>

            {/* CTA — planning */}
            <View style={[styles.divider, { backgroundColor: theme.backgroundElement }]} />
            {user && (
              <>
                {!showPlanningForm ? (
                  <Button
                    label="Ajouter au planning"
                    onPress={() => setShowPlanningForm(true)}
                  />
                ) : (
                  <ThemedView type="backgroundElement" style={styles.planningModal}>
                    {slotsLoading ? (
                      <ActivityIndicator />
                    ) : hasSlots ? (
                      <>
                        <ThemedText type="smallBold">Choisir un jour</ThemedText>
                        <Calendar
                          markedDates={markedDates}
                          selectedDate={selectedDate}
                          onSelectDate={(date) => {
                            setSelectedDate(date);
                            setSelectedSlotId(null);
                          }}
                        />
                        {selectedDate && (
                          <>
                            <ThemedText type="smallBold" style={{ textTransform: 'capitalize' }}>
                              {formatDayLabel(selectedDate)}
                            </ThemedText>
                            <View style={styles.slotRow}>
                              {(slotsByDate.get(selectedDate) ?? []).map((slot) => {
                                const full = slot.remaining <= 0;
                                const selected = slot.id === selectedSlotId;
                                return (
                                  <Pressable
                                    key={slot.id}
                                    disabled={full}
                                    onPress={() => setSelectedSlotId(slot.id)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Créneau ${formatTime(slot.startsAt)}, ${full ? 'complet' : `${slot.remaining} place${slot.remaining > 1 ? 's' : ''}`}`}
                                    accessibilityState={{ disabled: full, selected }}
                                    style={[
                                      styles.slotChip,
                                      {
                                        backgroundColor: selected ? theme.text : theme.backgroundSelected,
                                        opacity: full ? 0.45 : 1,
                                      },
                                    ]}>
                                    <ThemedText
                                      type="smallBold"
                                      style={{ color: selected ? theme.background : theme.text }}>
                                      {formatTime(slot.startsAt)}
                                    </ThemedText>
                                    <ThemedText
                                      type="small"
                                      style={{ color: selected ? theme.background : theme.textSecondary }}>
                                      {full
                                        ? 'Complet'
                                        : `${slot.remaining} place${slot.remaining > 1 ? 's' : ''}`}
                                    </ThemedText>
                                  </Pressable>
                                );
                              })}
                            </View>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <ThemedText type="smallBold">Choisir un créneau</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          Activité en accès libre — indique quand tu prévois d&apos;y aller :
                        </ThemedText>
                        <Calendar
                          markedDates={markedDates}
                          selectedDate={selectedDate}
                          allowAnyFutureDate
                          onSelectDate={(date) => {
                            setSelectedDate(date);
                            setSelectedTime(null);
                          }}
                        />
                        {selectedDate && (
                          <>
                            <ThemedText type="smallBold" style={{ textTransform: 'capitalize' }}>
                              {formatDayLabel(selectedDate)}
                            </ThemedText>
                            <TimePicker value={selectedTime} onChange={setSelectedTime} />
                          </>
                        )}
                      </>
                    )}
                    <View style={styles.ctaRow}>
                      <Button
                        label="Annuler"
                        variant="ghost"
                        style={{ flex: 1 }}
                        onPress={closePlanningForm}
                      />
                      <Button
                        label="Réserver"
                        style={{ flex: 1 }}
                        loading={planningLoading}
                        disabled={hasSlots ? !selectedSlotId : !selectedDate || !selectedTime}
                        onPress={handleAddToPlanning}
                      />
                    </View>
                  </ThemedView>
                )}
              </>
            )}

            {/* Reviews */}
            <View style={[styles.divider, { backgroundColor: theme.backgroundElement }]} />
            <View style={styles.section}>
              <ThemedText type="smallBold">
                Avis ({reviews?.reviewCount ?? 0})
              </ThemedText>

              {/* Submit rating */}
              {user && (
                <View>
                  <ThemedText type="small" themeColor="textSecondary">
                    Donne ta note :
                  </ThemedText>
                  <View style={styles.ratingInput}>
                    <StarRating
                      value={pendingRating}
                      onRate={setPendingRating}
                    />
                  </View>
                  {pendingRating > 0 && (
                    <Button
                      label="Publier mon avis"
                      loading={ratingSubmitting}
                      onPress={() => submitRating(pendingRating)}
                    />
                  )}
                </View>
              )}

              {/* Reviews list */}
              {reviews?.data.length === 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  Aucun avis pour le moment. Sois le premier !
                </ThemedText>
              )}
              {reviews?.data.map((review) => (
                <View key={review.id} style={styles.reviewItem}>
                  <ThemedView type="backgroundElement" style={styles.reviewAvatar}>
                    <Icon name="account-circle" size={16} themeColor="textSecondary" />
                  </ThemedView>
                  <View style={styles.reviewBody}>
                    <View style={styles.reviewMeta}>
                      <ThemedText type="smallBold">{review.author.pseudo}</ThemedText>
                      <StarRating value={review.rating} size="small" />
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>

          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
