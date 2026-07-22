import { ActivityFormView } from '@/components/organizer/activity-form-view';

// Création d'une activité (organisateur). La garde `OrganizerOnly` et le
// header sont portés par `ActivityFormView`. Sans `activityId`, on est en
// mode création.
export default function NewActivityScreen() {
  return <ActivityFormView />;
}
