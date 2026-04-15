import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export default function Index() {
  const { isAuthenticated, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(tabs)/" />;
}
