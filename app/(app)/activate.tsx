import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Lightbulb } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import { useRouter } from 'expo-router';

export default function ActivateScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleActivate = async () => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      Alert.alert('Gabim', 'Ju lutem shkruani kodin tuaj.');
      return;
    }
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Gabim', 'Ju duhet të jeni të kyçur.');
        setLoading(false); return;
      }

      // Same code already active — nothing to do.
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium, order_code')
        .eq('id', user.id)
        .single();

      if (profile?.is_premium && profile?.order_code === trimmedCode) {
        Alert.alert('Kod i Njëjtë', 'Ky kod është i njëjtë me atë aktual. Futni kodin e paketës suaj të re.');
        setLoading(false); return;
      }

      // Activation is validated, claimed and granted atomically on the server
      // (SECURITY DEFINER RPC). The client can no longer set is_premium directly.
      const { data: result, error: rpcError } = await supabase.rpc('redeem_order_code', {
        p_code: trimmedCode,
      });

      if (rpcError) {
        Alert.alert('Gabim', 'Diçka shkoi keq. Provoni përsëri.');
        setLoading(false); return;
      }

      if (!result?.ok) {
        const messages: Record<string, string> = {
          invalid_code: 'Kodi që shkruat nuk u gjet. Kontrolloni kodin dhe provoni përsëri.',
          already_used: 'Ky kod është përdorur tashmë. Kontaktoni SoHealthy nëse mendoni ka gabim.',
          not_authenticated: 'Ju duhet të jeni të kyçur.',
          empty_code: 'Ju lutem shkruani kodin tuaj.',
        };
        Alert.alert('Kod i Pavlefshëm', messages[result?.error as string] || 'Kodi nuk u pranua. Provoni përsëri.');
        setLoading(false); return;
      }

      Alert.alert(
        'Urime!',
        'Llogaria juaj premium u aktivizua me sukses!',
        [{ text: 'Vazhdo', onPress: () => router.replace('/(app)/my-packages') }]
      );

    } catch (err) {
      Alert.alert('Gabim', 'Diçka shkoi keq. Provoni përsëri.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Aktivizo Llogarinë</Text>
        <Text style={styles.subtitle}>
          Shkruani kodin që gjetët në paketën tuaj SoHealthy
        </Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="p.sh. HY8364125"
          placeholderTextColor="#aaa"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleActivate}
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleActivate}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#ECEFE8" />
            : <Text style={styles.buttonText}>Aktivizo</Text>
          }
        </TouchableOpacity>
        <View style={styles.hintRow}>
          <Lightbulb size={14} color="#999" strokeWidth={1.75} />
          <Text style={styles.hint}>Kodi gjendet brenda paketës suaj, shkruar në letër.</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECEFE8', justifyContent: 'center', paddingHorizontal: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 28, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  title: { fontSize: 24, fontWeight: '700', color: '#1B3F2F', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  input: { borderWidth: 1.5, borderColor: '#71B5A2', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, fontWeight: '600', color: '#1B3F2F', letterSpacing: 1.5, textAlign: 'center', marginBottom: 20, backgroundColor: '#ECEFE8' },
  button: { backgroundColor: '#1B3F2F', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  buttonDisabled: { backgroundColor: '#71B5A2' },
  buttonText: { color: '#ECEFE8', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  hint: { fontSize: 12, color: '#999', textAlign: 'center', lineHeight: 18 },
});
