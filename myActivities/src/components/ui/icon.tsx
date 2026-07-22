import { MaterialIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

type Props = {
  name: IconName;
  size?: number;
  /** Couleur explicite (prioritaire sur `themeColor`). */
  color?: string;
  /** Couleur issue du thème courant. Par défaut : `text`. */
  themeColor?: ThemeColor;
};

/** Icône Material cross-platform (iOS / Android / web), teintée via le thème. */
export function Icon({ name, size = 20, color, themeColor = 'text' }: Props) {
  const theme = useTheme();
  return <MaterialIcons name={name} size={size} color={color ?? theme[themeColor]} />;
}
