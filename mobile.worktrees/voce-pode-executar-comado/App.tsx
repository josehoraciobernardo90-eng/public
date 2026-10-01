import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

const DEFAULT_SERVER_URL = 'http://10.239.218.150:3000';

export default function App() {
  const [serverAddress, setServerAddress] = useState(DEFAULT_SERVER_URL);
  const [activeUrl, setActiveUrl] = useState<string | null>(DEFAULT_SERVER_URL);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    if (!activeUrl || !isLoading || errorMessage) return;

    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      setErrorMessage('O telefone não recebeu resposta em 20 segundos. Verifique a rede Wi-Fi, o endereço e o firewall do computador.');
    }, 20000);

    return () => clearTimeout(timeoutId);
  }, [activeUrl, errorMessage, isLoading]);

  const connectToServer = () => {
    const input = serverAddress.trim();
    const candidate = input.includes('://') ? input : `http://${input}`;

    try {
      const url = new URL(candidate);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Use um endereço HTTP ou HTTPS.');
      }
      if (['localhost', '127.0.0.1'].includes(url.hostname.toLowerCase())) {
        throw new Error('Use o IPv4 do computador, não localhost.');
      }

      setServerAddress(url.origin);
      setErrorMessage(null);
      setIsLoading(true);
      setActiveUrl(url.origin);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Endereço inválido.');
    }
  };

  if (activeUrl) {
    return (
      <SafeAreaView style={styles.browserScreen}>
        <StatusBar style="light" />
        <View style={styles.browserHeader}>
          <View style={styles.browserHeading}>
            <Text style={styles.browserTitle}>LIMPA-LAAA</Text>
            <Text style={styles.browserAddress} numberOfLines={1}>{activeUrl}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setActiveUrl(null);
              setErrorMessage(null);
            }}
            style={styles.headerButton}
          >
            <Text style={styles.headerButtonText}>Servidor</Text>
          </Pressable>
        </View>
        {errorMessage ? (
          <View style={styles.errorPanel}>
            <Text style={styles.errorTitle}>Não foi possível abrir o app</Text>
            <Text style={styles.errorText}>
              {errorMessage || 'Confira o endereço, a mesma rede Wi-Fi e a liberação do Node.js no firewall do computador.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setErrorMessage(null);
                setIsLoading(true);
                setReloadCount((count) => count + 1);
              }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.webViewContainer}>
            <WebView
              key={reloadCount}
              source={{ uri: activeUrl }}
              javaScriptEnabled
              domStorageEnabled
              setSupportMultipleWindows={false}
              originWhitelist={['http://*', 'https://*']}
              onLoadStart={() => setIsLoading(true)}
              onLoadEnd={() => setIsLoading(false)}
              onError={(event) => {
                setIsLoading(false);
                setErrorMessage(event.nativeEvent.description || 'Falha de conexão.');
              }}
              onHttpError={(event) => {
                setIsLoading(false);
                setErrorMessage(`O servidor respondeu com erro HTTP ${event.nativeEvent.statusCode}.`);
              }}
            />
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.green} />
                <Text style={styles.loadingText}>Conectando ao computador...</Text>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.setupScreen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardArea}
      >
        <View style={styles.setupContent}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>LL</Text>
          </View>
          <Text style={styles.eyebrow}>LIMPA-LAAA · TESTE MÓVEL</Text>
          <Text style={styles.title}>Conecte ao{ '\n' }seu computador.</Text>
          <Text style={styles.description}>
            Informe o endereço IPv4 do computador onde o servidor de desenvolvimento está rodando.
          </Text>

          <View style={styles.form}>
            <Text style={styles.fieldLabel}>ENDEREÇO DO SERVIDOR</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              onChangeText={(value) => {
                setServerAddress(value);
                setErrorMessage(null);
              }}
              onSubmitEditing={connectToServer}
              placeholder="192.168.1.25:3000"
              placeholderTextColor={colors.muted}
              returnKeyType="go"
              value={serverAddress}
              style={styles.addressInput}
            />
            {errorMessage && <Text style={styles.validationError}>{errorMessage}</Text>}
            <Pressable
              accessibilityRole="button"
              onPress={connectToServer}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.primaryButtonText}>Abrir no telefone</Text>
              <Text style={styles.buttonArrow}>›</Text>
            </Pressable>
          </View>

          <View style={styles.networkNote}>
            <View style={styles.noteIndicator} />
            <Text style={styles.noteText}>
              Computador e telefone precisam estar na mesma rede Wi-Fi. Não use localhost no telefone.
            </Text>
          </View>
        </View>
        <Text style={styles.footer}>SERVIDOR LOCAL · PORTA 3000</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const colors = {
  background: '#101A17',
  panel: '#182521',
  green: '#68D391',
  yellow: '#F6C453',
  text: '#F3F6F4',
  muted: '#8A9B93',
  red: '#FF8A80',
};

const styles = StyleSheet.create({
  setupScreen: { flex: 1, backgroundColor: colors.background },
  keyboardArea: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 26, paddingVertical: 30 },
  setupContent: { width: '100%', maxWidth: 460, alignSelf: 'center', marginTop: 28 },
  brandMark: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  brandMarkText: { color: colors.background, fontSize: 19, fontWeight: '900' },
  eyebrow: { color: colors.yellow, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 13 },
  title: { color: colors.text, fontSize: 34, lineHeight: 40, fontWeight: '800' },
  description: { color: colors.muted, fontSize: 15, lineHeight: 23, marginTop: 14, maxWidth: 360 },
  form: { marginTop: 36 },
  fieldLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginBottom: 10 },
  addressInput: {
    height: 56,
    borderWidth: 1,
    borderColor: '#34443D',
    borderRadius: 10,
    backgroundColor: colors.panel,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 16,
  },
  validationError: { color: colors.red, fontSize: 13, marginTop: 9 },
  primaryButton: {
    minHeight: 54,
    borderRadius: 10,
    backgroundColor: colors.green,
    paddingHorizontal: 18,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonPressed: { opacity: 0.82 },
  primaryButtonText: { color: colors.background, fontSize: 14, fontWeight: '800' },
  buttonArrow: { color: colors.background, fontSize: 28, lineHeight: 30, fontWeight: '500' },
  networkNote: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 22, gap: 10 },
  noteIndicator: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.yellow, marginTop: 5 },
  noteText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 19 },
  footer: { color: '#65766E', fontSize: 10, fontWeight: '700', letterSpacing: 1.1, textAlign: 'center' },
  browserScreen: { flex: 1, backgroundColor: colors.background },
  browserHeader: {
    minHeight: 60,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#293832',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  browserHeading: { flex: 1 },
  browserTitle: { color: colors.text, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  browserAddress: { color: colors.muted, fontSize: 10, marginTop: 3 },
  headerButton: { paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.panel, borderRadius: 8 },
  headerButtonText: { color: colors.green, fontSize: 11, fontWeight: '800' },
  webViewContainer: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: colors.background,
  },
  loadingText: { color: colors.muted, fontSize: 13 },
  errorPanel: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  errorTitle: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  errorText: { color: colors.muted, fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 12 },
});
