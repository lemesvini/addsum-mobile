import { Platform } from 'react-native';

/**
 * GERADO AUTOMATICAMENTE a partir de src/global.css — não edite manualmente.
 * Execute: pnpm theme:sync
 *
 * Valores em hex para estilos via props (ícones, gráficos, headers de navegação).
 * Para estilos via className, edite src/global.css e tailwind.config.js.
 */
export const Colors = {
  light: {
    background: '#FFFFFF',
    foreground: '#0F1729',
    card: '#FFFFFF',
    cardForeground: '#0F1729',
    popover: '#FFFFFF',
    popoverForeground: '#0F1729',
    primary: '#10B77F',
    primaryForeground: '#FFFFFF',
    secondary: '#F9FAFB',
    secondaryForeground: '#0F1729',
    muted: '#F3F4F6',
    mutedForeground: '#6B7280',
    accent: '#D1FAE7',
    accentForeground: '#047752',
    destructive: '#EF4343',
    destructiveForeground: '#FFFFFF',
    border: '#E5E7EB',
    input: '#E5E7EB',
    ring: '#10B77F',
    buttonPrimary: '#10B77F',
    buttonText: '#FFFFFF',
  },
  dark: {
    background: '#000000',
    foreground: '#FFFFFF',
    card: '#0F0F0F',
    cardForeground: '#FFFFFF',
    popover: '#171D2B',
    popoverForeground: '#FFFFFF',
    primary: '#29BC86',
    primaryForeground: '#FFFFFF',
    secondary: '#232A38',
    secondaryForeground: '#FFFFFF',
    muted: '#1F2532',
    mutedForeground: '#9EA3AE',
    accent: '#03593E',
    accentForeground: '#BAF8DB',
    destructive: '#EF4343',
    destructiveForeground: '#FFFFFF',
    border: '#2D3443',
    input: '#313849',
    ring: '#29BC86',
    buttonPrimary: '#29BC86',
    buttonText: '#FFFFFF',
  },
} as const;

export type ColorToken = keyof typeof Colors.light & keyof typeof Colors.dark;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
