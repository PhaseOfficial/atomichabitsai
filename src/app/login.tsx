import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, LogIn, UserPlus, Sparkles, ArrowRight } from 'lucide-react-native';
import { SPACING, FONTS, ROUNDNESS } from '@/src/constants/Theme';
import { useTheme } from '@/src/hooks/useTheme';
import { supabase } from '@/src/lib/supabase';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        Alert.alert('Success', 'Check your email for the confirmation link!');
      } else {
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;

        // Ensure profile exists
        if (authData?.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ 
              id: authData.user.id, 
              email: authData.user.email,
              updated_at: new Date().toISOString()
            });
          
          if (profileError) {
            console.error('Error ensuring profile exists:', profileError.message);
          }
        }

        router.replace('/(tabs)/');
      }
    } catch (error: any) {
      Alert.alert('Auth Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('@/assets/images/Artboard 1 logo.png')} 
                style={[styles.logoImage, { tintColor: colors.primary }]} 
                resizeMode="contain" 
              />
            </View>
            <Text style={styles.title}>{isSignUp ? 'Join Batsir' : 'Welcome Back'}</Text>
            <Text style={styles.subtitle}>
              {isSignUp ? 'Start your journey to atomic efficiency.' : 'Find your flow state and continue building.'}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <View style={styles.inputWrapper}>
                <Mail size={20} color={colors.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.outline}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Lock size={20} color={colors.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Your secure password"
                  placeholderTextColor={colors.outline}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]} 
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
                  {isSignUp ? <UserPlus size={18} color={colors.onPrimary} /> : <LogIn size={18} color={colors.onPrimary} />}
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.switchBtn} 
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text style={styles.switchBtnText}>
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>

          {!isSignUp && (
            <View style={styles.featureHighlight}>
              <View style={styles.featureIcon}>
                <Sparkles size={20} color={colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Batsirai Integration</Text>
                <Text style={styles.featureDesc}>Your personal flow assistant is ready to help you optimize your schedule.</Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.guestBtn} onPress={() => router.replace('/(tabs)/')}>
            <Text style={styles.guestBtnText}>Continue as Guest</Text>
            <ArrowRight size={14} color={colors.outline} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.xl,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    marginBottom: SPACING.xxl,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: SPACING.lg,
  },
  logoImage: {
    height: 48,
    width: 180,
  },
  title: {
    fontFamily: FONTS.headline,
    fontSize: 32,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 16,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  form: {
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 1.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: ROUNDNESS.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '4D',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 52,
    fontFamily: FONTS.body,
    fontSize: 16,
    color: colors.onSurface,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: ROUNDNESS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  primaryBtnText: {
    color: colors.onPrimary,
    fontFamily: FONTS.labelSm,
    fontSize: 16,
  },
  switchBtn: {
    alignItems: 'center',
    padding: 10,
  },
  switchBtnText: {
    fontFamily: FONTS.label,
    fontSize: 14,
    color: colors.primary,
  },
  featureHighlight: {
    flexDirection: 'row',
    backgroundColor: colors.primaryContainer + '40',
    padding: SPACING.lg,
    borderRadius: ROUNDNESS.lg,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    marginBottom: SPACING.xl,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: FONTS.headline,
    fontSize: 16,
    color: colors.onSurface,
    marginBottom: 2,
  },
  featureDesc: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 10,
  },
  guestBtnText: {
    fontFamily: FONTS.label,
    fontSize: 14,
    color: colors.outline,
  },
});
