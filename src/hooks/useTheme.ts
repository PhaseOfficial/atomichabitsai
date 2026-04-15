import { useColorScheme } from 'react-native';
import { COLORS } from '../constants/Theme';

export const useTheme = () => {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = COLORS[colorScheme as keyof typeof COLORS];
  
  return {
    colors,
    colorScheme,
    isDark: colorScheme === 'dark',
  };
};
