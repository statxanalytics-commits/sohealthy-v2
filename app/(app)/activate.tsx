import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
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

      // Check if already premium
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium, order_code')
        .eq('id', user.id)
        .single();

      if (profile?.is_premium) {
        Alert.alert('Llogaria Aktive ✅', 'Llogaria juaj është tashmë premium!');
        setLoading(false); return;
      }

      // Check order code
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('id, used, activated_by')
        .eq('order_code', trimmedCode)
        .single();

      if (fetchError || !order) {
        Alert.alert('Kod i Pavlefshëm', 'Kodi që shkruat nuk u gjet. Kontrolloni kodin dhe provoni përsëri.');
        setLoading(false); return;
      }

      if (order.used) {
        Alert.alert('Kod i Përdorur', 'Ky kod është përdorur tashmë. Kontaktoni SoHealthy nëse mendoni ka gabim.');
        setLoading(false); return;
      }

      // Update order as used
      await supabase
        .from('orders')
        .update({ used: true, activated_by: user.id, verified_at: new Date().toISOString() })
        .eq('id', order.id);

      // Upsert profile as premium
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          username: user.email?.split('@')[0] || 'user',
          is_premium: true,
          order_code: trimmedCode,
          plan_start: new Date().toISOString(),
        });

      // Save to purchase_history for loyalty/discount tracking
      const { data: orderData } = await supabase
        .from('orders')
        .select('sheet_source')
        .eq('order_code', trimmedCode)
        .single();

      await supabase.from('purchase_history').upsert({
        user_id: user.id,
        order_code: trimmedCode,
        package_type: orderData?.sheet_source || 'unknown',
        activated_at: new Date().toISOString(),
        source: orderData?.sheet_source || 'unknown',
      }, { onConflict: 'order_code' });

      // Check if already selected a product for this code
      const { data: existingSelection } = await supabase
        .from('product_selections')
        .select('product_slug')
        .eq('user_id', user.id)
        .eq('order_code', trimmedCode)
        .eq('is_active', true)
        .single();

      Alert.alert(
        'Urime! 🎉',
        'Llogaria juaj premium u aktivizua me sukses!',
        [{
          text: 'Vazhdo',
          onPress: () => {
            if (existingSelection?.product_slug) {
              router.replace({ pathname: '/(app)/product-detail', params: { slug: existingSelection.product_slug } });
            } else {
              router.replace('/(app)/select-product');
            }
          }
        }]
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
  input: { borderWidth: 1.5, borderColor: '#71B5A2', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, fontWeight: '600', color: '#1B3F2F', letterSpacing: 1.5, textAlign: 'center', marginBottom: 20, backgroundColor: '#ECEFE8' },
  button: { backgroundColor: '#1B3F2F', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  buttonDisabled: { backgroundColor: '#71B5A2' },
  buttonText: { color: '#ECEFE8', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  hint: { fontSize: 12, color: '#999', textAlign: 'center', lineHeight: 18 },
});
