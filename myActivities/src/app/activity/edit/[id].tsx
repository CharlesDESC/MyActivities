import { useLocalSearchParams } from 'expo-router';

import { ActivityFormView } from '@/components/organizer/activity-form-view';
import { useActivityDetail } from '@/hooks/use-activity-detail';

// Édition d'une activité (organisateur). On charge la fiche via son id puis on
// la passe en `initial` ; `ActivityFormView` porte la garde `OrganizerOnly` et
// le backend vérifie en plus la propriété (un organisateur n'édite que les
// siennes). Fournir `activityId` bascule le formulaire en mode édition (PATCH).
export default function EditActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activity, isLoading } = useActivityDetail(id);

  return <ActivityFormView activityId={id} initial={activity} loading={isLoading} />;
}
