import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useRouter } from 'expo-router';

export default function ActivateScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleActivate = async () => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) { setError('Ju lutem shkruani kodin tuaj.'); return; }
    setLoading(true); setError(''); setSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Ju duhet të jeni të kyçur.'); setLoading(false); return; }

      // Check if same code already active
      const { data: profile } = await supabase
        .from('profiles').select('is_premium, order_code').eq('id', user.id).single();

      if (profile?.is_premium && profile?.order_code === trimmedCode) {
        setError('Ky kod është i njëjtë me atë aktual. Futni kodin e paketës suaj të re.');
        setLoading(false); return;
      }

      // Check order code
      const { data: order, error: fetchError } = await supabase
        .from('orders').select('id, used, activated_by').eq('order_code', trimmedCode).single();

      if (fetchError || !order) {
        setError('Kodi që shkruat nuk u gjet. Kontrolloni kodin dhe provoni përsëri.');
        setLoading(false); return;
      }

      if (order.used && order.activated_by !== user.id) {
        setError('Ky kod është përdorur tashmë. Kontaktoni SoHealthy nëse mendoni ka gabim.');
        setLoading(false); return;
      }

      // Mark order used
      await supabase.from('orders')
        .update({ used: true, activated_by: user.id, verified_at: new Date().toISOString() })
        .eq('id', order.id);

      // Update profile to premium
      await supabase.from('profiles').upsert({
        id: user.id, email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        username: user.email?.split('@')[0] || 'user',
        is_premium: true, order_code: trimmedCode,
        plan_start: new Date().toISOString(),
      });

      // Deactivate old diet/products
      await supabase.from('diet_plans').update({ is_active: false }).eq('user_id', user.id).eq('is_active', true);
      await supabase.from('product_selections').update({ is_active: false }).eq('user_id', user.id).eq('is_active', true);

      // Save purchase history
      const { data: orderData } = await supabase.from('orders').select('sheet_source').eq('order_code', trimmedCode).single();
      await supabase.from('purchase_history').upsert({
        user_id: user.id, order_code: trimmedCode,
        package_type: orderData?.sheet_source || 'unknown',
        activated_at: new Date().toISOString(),
        source: orderData?.sheet_source || 'unknown',
      }, { onConflict: 'order_code' });

      setSuccess('Llogaria juaj premium u aktivizua me sukses! 🎉');
      setTimeout(() => {
        router.replace('/(app)/(tabs)/')
      }, 1500);

    } catch (err) {
      setError('Diçka shkoi keq. Provoni përsëri.');
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
          style={[styles.input, error ? styles.inputError : null]}
          value={code}
          onChangeText={t => { setCode(t); setError(''); }}
          placeholder="p.sh. HY8364125"
          placeholderTextColor="#aaa"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleActivate}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.successMsg}>{success}</Text> : null}
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
        <Text style={styles.hint}>
          💡 Kodi gjendet brenda paketës suaj, shkruar në letër.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECEFE8', justifyContent: 'center', paddingHorizontal: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 28, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  title: { fontSize: 24, fontWeight: '700', color: '#1B3F2F', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  input: { borderWidth: 1.5, borderColor: '#71B5A2', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, fontWeight: '600', color: '#1B3F2F', letterSpacing: 1.5, textAlign: 'center', marginBottom: 12, backgroundColor: '#ECEFE8' },
  inputError: { borderColor: '#B74949' },
  error: { color: '#B74949', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  successMsg: { color: '#2E7D32', fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  button: { backgroundColor: '#1B3F2F', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  buttonDisabled: { backgroundColor: '#71B5A2' },
  buttonText: { color: '#ECEFE8', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  hint: { fontSize: 12, color: '#999', textAlign: 'center', lineHeight: 18 },
});
