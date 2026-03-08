import { useState } from 'react';
import { View, Text, Pressable, Alert, Linking, ActivityIndicator, StyleSheet } from 'react-native';
import { fromByteArray } from 'base64-js';
import { useUserStore } from '@/stores';
import { connectWallet, signAuthChallengeMessage } from '@/services/solana';
import { hasRemoteLessonApi } from '@/services/api';
import { issueBackendSession } from '@/services/api/auth/backendAuth';
import { ScreenBackground, T, ts } from '@/theme';

export function WalletConnectScreen() {
  const setWallet = useUserStore((s) => s.setWallet);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const session = await connectWallet();

      let backendSession: { accessToken: string; refreshToken: string } | null = null;
      try {
        backendSession = await issueBackendSession(
          session.publicKey,
          async (message) => {
            const signatureBytes = await signAuthChallengeMessage(
              session.publicKey,
              message,
              session.authToken,
            );
            return fromByteArray(signatureBytes);
          },
        );
      } catch (error) {
        console.warn('Backend auth bootstrap failed:', error);
        if (hasRemoteLessonApi()) {
          Alert.alert(
            'Verification Failed',
            'Wallet connection succeeded, but backend verification did not. Please try again.',
          );
          return;
        }
        Alert.alert(
          'Wallet Connected',
          'Connected wallet, but backend sync was not authorized. You can continue; lesson sync stays local until backend auth succeeds.',
        );
      }

      setWallet(
        session.publicKey,
        session.authToken,
        backendSession?.accessToken ?? undefined,
        backendSession?.refreshToken ?? undefined,
      );
    } catch (error: any) {
      const code = error?.code;
      if (code === 'ERROR_WALLET_NOT_FOUND') {
        Alert.alert(
          'No Wallet Found',
          'Install a Solana wallet like Phantom to continue.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Get Phantom',
              onPress: () => Linking.openURL('https://phantom.app/download'),
            },
          ],
        );
      } else if (code === 'ERROR_WALLET_ADAPTER_UNAVAILABLE') {
        Alert.alert(
          'Unsupported Runtime',
          'This build does not include Solana Mobile Wallet Adapter. Use an Android custom dev build (EAS or local) instead of Expo Go/iOS runtime.',
        );
      } else if (code === 'ERROR_AUTHORIZATION_FAILED') {
        // User rejected — do nothing, they can try again
      } else {
        Alert.alert('Connection Failed', 'Something went wrong. Please try again.');
        console.warn('Wallet connect error:', error);
      }
    } finally {
      setConnecting(false);
    }
  };

  return (
    <ScreenBackground>
      <View style={s.centered}>
        <Text style={s.title}>Locked In</Text>
        <Text style={s.subtitle}>
          Lock your funds. Light the flame. Learn or burn.
        </Text>

        <View style={s.connectBtnWrap}>
          <Pressable
            style={[ts.primaryBtn, s.connectBtn, connecting && { opacity: 0.6 }]}
            onPress={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <ActivityIndicator color="#1A1000" />
            ) : (
              <Text style={ts.primaryBtnText}>Connect Wallet</Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: 'Georgia',
    fontSize: 36,
    fontWeight: '700',
    color: T.textPrimary,
    letterSpacing: 1,
  },
  subtitle: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 15,
    color: T.textSecondary,
    lineHeight: 22,
  },
  connectBtnWrap: {
    marginTop: 48,
    width: '100%',
  },
  connectBtn: {
    backgroundColor: T.violet,
    borderColor: '#B06AFF',
  },
});
