import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { styles } from '@/styles/components/organizer/activity-form';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { WebContainer } from '@/components/web/web-container';
import { OrganizerOnly } from '@/components/organizer/organizer-only';
import { useTheme } from '@/hooks/use-theme';
import { useActivityForm } from '@/hooks/use-activity-form';
import { CATEGORY_CONFIG, type ActivityCategory, type ActivityDetail } from '@/types/activity';

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as ActivityCategory[];

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
  const theme = useTheme();
  const { values, errors, isSubmitting, isEditing, setField, submit } = useActivityForm({ activityId, initial });

  async function handleSubmit() {
    try {
      await submit();
      router.replace('/my-activities');
    } catch {
      /* erreur exposée via errors.global */
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <OrganizerOnly>
          <WebContainer>
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour">
                <Icon name="arrow-back" size={24} />
              </Pressable>
              <ThemedText type="title" style={styles.title}>
                {isEditing ? 'Modifier l’activité' : 'Nouvelle activité'}
              </ThemedText>
            </View>

            {loading ? (
              <ActivityIndicator style={styles.center} />
            ) : (
              <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
                {errors.global && (
                  <ThemedView type="backgroundElement" style={styles.globalError}>
                    <ThemedText type="small" style={styles.errorText}>{errors.global}</ThemedText>
                  </ThemedView>
                )}

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

                <Input label="Adresse" placeholder="12 rue…" value={values.address}
                  onChangeText={(v) => setField('address', v)} error={errors.address} autoCapitalize="sentences" />

                <View style={styles.rowFields}>
                  <Input label="Latitude" placeholder="48.8566" value={values.latitude}
                    onChangeText={(v) => setField('latitude', v)} error={errors.latitude}
                    keyboardType="numbers-and-punctuation" style={styles.flex} />
                  <Input label="Longitude" placeholder="2.3522" value={values.longitude}
                    onChangeText={(v) => setField('longitude', v)} error={errors.longitude}
                    keyboardType="numbers-and-punctuation" style={styles.flex} />
                </View>

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
              </ScrollView>
            )}
          </WebContainer>
        </OrganizerOnly>
      </SafeAreaView>
    </ThemedView>
  );
}
