import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { styles } from '@/styles/app/reservations';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { WebContainer } from '@/components/web/web-container';
import { OrganizerOnly } from '@/components/organizer/organizer-only';
import { useActivityReservations } from '@/hooks/use-activity-reservations';
import type { ReservationSlot } from '@/types/activity';

/** « lundi 15 août, 10:00 » */
function formatSlot(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${day}, ${time}`;
}

function SlotCard({ slot }: { slot: ReservationSlot }) {
  return (
    <ThemedView type="backgroundElement" style={styles.slot}>
      <View style={styles.slotHeader}>
        <Icon name="event" size={20} themeColor="textSecondary" />
        <ThemedText type="smallBold" style={styles.slotTitle} numberOfLines={1}>
          {formatSlot(slot.startsAt)}
        </ThemedText>
        <View style={styles.countBadge}>
          <Icon name="people" size={14} themeColor="textSecondary" />
          <ThemedText type="small" themeColor="textSecondary">
            {slot.booked}/{slot.capacity}
          </ThemedText>
        </View>
      </View>

      {slot.attendees.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.noAttendee}>
          Aucune réservation sur ce créneau.
        </ThemedText>
      ) : (
        slot.attendees.map((a) => (
          <View key={a.userId} style={styles.attendee}>
            <Icon name="account-circle" size={24} themeColor="textSecondary" />
            <ThemedText type="small" numberOfLines={1}>{a.pseudo}</ThemedText>
          </View>
        ))
      )}
    </ThemedView>
  );
}

export default function ReservationsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { reservations, totalBooked, isLoading, error, refresh } = useActivityReservations(id);

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/my-activities');
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
              <View style={styles.headerText}>
                <ThemedText type="title" numberOfLines={1}>Réservations</ThemedText>
                {reservations && (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {reservations.activityName} · {totalBooked} réservation{totalBooked > 1 ? 's' : ''}
                  </ThemedText>
                )}
              </View>
            </View>

            {error ? (
              <View style={styles.center}>
                <ThemedText type="small" themeColor="textSecondary">{error}</ThemedText>
                <Button label="Réessayer" variant="ghost" onPress={refresh} />
              </View>
            ) : isLoading ? (
              <ActivityIndicator style={styles.center} />
            ) : (
              <FlatList
                data={reservations?.slots ?? []}
                keyExtractor={(item) => item.id}
                refreshing={isLoading}
                onRefresh={refresh}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => <SlotCard slot={item} />}
                ListEmptyComponent={
                  <View style={styles.empty}>
                    <Icon name="event-busy" size={44} themeColor="textSecondary" />
                    <ThemedText type="smallBold">Aucun créneau</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                      Ajoute des créneaux à ton activité pour recevoir des réservations.
                    </ThemedText>
                  </View>
                }
              />
            )}
          </WebContainer>
        </OrganizerOnly>
      </SafeAreaView>
    </ThemedView>
  );
}
