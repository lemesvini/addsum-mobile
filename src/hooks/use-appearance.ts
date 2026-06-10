import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export function useAppearance() {
  const scheme = useColorScheme();
  const colorScheme = scheme === 'unspecified' || scheme == null ? 'light' : scheme;
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme];

  return {
    colorScheme,
    isDark,
    iconColor: theme.cardForeground,
    iconColorSecondary: theme.mutedForeground,
  };
}
