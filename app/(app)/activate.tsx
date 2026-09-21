import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Lightbulb } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import { useRouter } from 'expo-router';

export default function ActivateScreen() {
  const [mode, setMode] = useState<'phone' | 'code'>('phone');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const success = () =>
    Alert.alert(
      'Urime!',
      'Llogaria juaj premium u aktivizua me sukses!',
      [{ text: 'Vazhdo', onPress: () => router.replace('/(app)/my-packages') }]
    );

  const handlePhone = async (phone: string) => {
    // Normalization (069…, +355 69…, 69…) happens on the server.
    const { data: result, error } = await supabase.rpc('redeem_by_phone', { p_phone: phone });
    if (error) { Alert.alert('Gabim', 'Diçka shkoi keq. Provoni përsëri.'); return; }
    if (result?.ok) { success(); return; }
    const messages: Record<string, string> = {
      invalid_phone: 'Numri nuk duket i saktë. Shkruajeni p.sh. 069 123 4567.',
      not_found: 'Nuk gjetëm asnjë paketë të dorëzuar me këtë numër. Përdorni numrin që dhatë kur porositët. Nëse paketa ju erdhi sot, provoni sërish pas orës 21:00.',
      already_active: 'Paketa juaj me këtë numër është tashmë aktive. Kur të bëni porosinë e radhës, aktivizojeni sërish këtu.',
      already_used: 'Paketa me këtë numër është aktivizuar nga një llogari tjetër. Na kontaktoni nëse mendoni se ka gabim.',
      rate_limited: 'Shumë tentativa. Provoni sërish pas një ore.',
      not_authenticated: 'Ju duhet të jeni të kyçur.',
    };
    Alert.alert('Nuk u aktivizua', messages[result?.error as string] || 'Provoni përsëri.');
  };

  const handleCode = async (code: string) => {
    const { data: result, error } = await supabase.rpc('redeem_order_code', { p_code: code });
    if (error) { Alert.alert('Gabim', 'Diçka shkoi keq. Provoni përsëri.'); return; }
    if (result?.ok) { success(); return; }
    const messages: Record<string, string> = {
      invalid_code: 'Kodi që shkruat nuk u gjet. Kontrolloni kodin dhe provoni përsëri.',
      already_used: 'Ky kod është përdorur tashmë. Kontaktoni SoHealthy nëse mendoni ka gabim.',
      not_authenticated: 'Ju duhet të jeni të kyçur.',
      empty_code: 'Ju lutem shkruani kodin tuaj.',
    };
    Alert.alert('Kod i Pavlefshëm', messages[result?.error as string] || 'Kodi nuk u pranua. Provoni përsëri.');
  };

  const handleActivate = async () => {
    const input = value.trim();
    if (!input) {
      Alert.alert('Gabim', mode === 'phone' ? 'Ju lutem shkruani numrin tuaj të telefonit.' : 'Ju lutem shkruani kodin tuaj.');
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert('Gabim', 'Ju duhet të jeni të kyçur.'); return; }
      if (mode === 'phone') await handlePhone(input);
      else await handleCode(input.toUpperCase());
    } catch (err) {
      Alert.alert('Gabim', 'Diçka shkoi keq. Provoni përsëri.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => { setValue(''); setMode(mode === 'phone' ? 'code' : 'phone'); };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Aktivizo Llogarinë</Text>
        <Text style={styles.subtitle}>
          {mode === 'phone'
            ? 'Vendos numrin e telefonit që përdore për porosinë për të aktivizuar Premium'
            : 'Shkruani kodin që gjetët në paketën tuaj SoHealthy'}
        </Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder={mode === 'phone' ? 'p.sh. 069 123 4567' : 'p.sh. HY8364125'}
          placeholderTextColor="#aaa"
          keyboardType={mode === 'phone' ? 'phone-pad' : 'default'}
          textContentType={mode === 'phone' ? 'telephoneNumber' : 'none'}
          autoComplete={mode === 'phone' ? 'tel' : 'off'}
          autoCapitalize={mode === 'phone' ? 'none' : 'characters'}
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
          <Text style={styles.hint}>
            {mode === 'phone'
              ? 'Pranohet çdo format: 069…, +355 69… ose 69…'
              : 'Kodi gjendet brenda paketës suaj, shkruar në letër.'}
          </Text>
        </View>
        <TouchableOpacity style={styles.helpLink} onPress={switchMode}>
          <Text style={styles.switchText}>
            {mode === 'phone' ? 'Keni një kod porosie? Aktivizo me kod' : 'Aktivizo me numër telefoni'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.helpLink} onPress={() => router.push('/faq')}>
          <Text style={styles.helpLinkText}>Ke nevojë për ndihmë? Shiko Pyetjet e Shpeshta</Text>
        </TouchableOpacity>
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
  helpLink: { marginTop: 18, alignItems: 'center' },
  switchText: { fontSize: 13, color: '#71B5A2', fontWeight: '600' },
  helpLinkText: { fontSize: 13, color: '#1B3F2F', fontWeight: '600', textDecorationLine: 'underline' },
});
