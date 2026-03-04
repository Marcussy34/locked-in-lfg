import './global.css';

import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from '@/navigation';
import { DungeonProvider } from '@/components/DungeonProvider';
import { useUserStore } from '@/stores';
import { reconnectWallet } from '@/services/solana';

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0a0a0a',
    card: '#111111',
    border: '#222222',
    primary: '#a855f7',
  },
};

/** Attempt silent MWA reauthorize on app launch using cached auth token */
function useAutoReconnect() {
  const authToken = useUserStore((s) => s.authToken);
  const walletAddress = useUserStore((s) => s.walletAddress);
  const setWallet = useUserStore((s) => s.setWallet);
  const disconnect = useUserStore((s) => s.disconnect);

  useEffect(() => {
    // Only attempt if we have a cached session
    if (!authToken || !walletAddress) return;

    reconnectWallet(authToken)
      .then((session) => {
        // Refresh the stored token (it may have rotated)
        setWallet(session.publicKey, session.authToken);
      })
      .catch(() => {
        // Token expired or invalid — send back to connect screen
        disconnect();
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

export default function App() {
  useAutoReconnect();

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={theme}>
        <DungeonProvider>
          <AppNavigator />
        </DungeonProvider>
        <StatusBar style="light" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
