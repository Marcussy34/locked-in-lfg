import { useRef, useEffect, type ReactNode } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ImageBackground,
  Animated,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Assets ──

export const woodBg = require('../assets/wood.png');
export const parchmentBg = require('../assets/partchmentpaper.png');

// ── Color palette (Dead Cells inspired) ──

export const T = {
  bg: '#06060C',
  bgCard: 'rgba(14,14,28,0.88)',
  bgCardActive: 'rgba(18,16,32,0.94)',
  amber: '#D4A04A',
  amberDim: '#8B6914',
  green: '#3EE68A',
  crimson: '#FF4466',
  teal: '#2AE8D4',
  violet: '#9945FF',
  rust: '#E8845A',
  textPrimary: '#E8DED0',
  textSecondary: 'rgba(255,255,255,0.42)',
  textMuted: 'rgba(255,255,255,0.22)',
  borderAlive: 'rgba(212,160,74,0.18)',
  borderDormant: 'rgba(255,255,255,0.06)',
};

// ── Shared styles ──

export const ts = StyleSheet.create({
  // Layout
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },

  // Card
  card: {
    position: 'relative',
    padding: 16,
    borderRadius: 10,
    backgroundColor: T.bgCard,
    borderWidth: 1,
    borderColor: T.borderDormant,
    overflow: 'hidden',
  },

  // Typography
  pageTitle: {
    fontFamily: 'Georgia',
    fontSize: 24,
    fontWeight: '700',
    color: T.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  pageSub: {
    fontSize: 12,
    color: T.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: T.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  cardLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: T.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: T.textPrimary,
    marginTop: 2,
  },
  statText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: T.textMuted,
  },

  // Button
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: T.amber,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8B860',
    elevation: 8,
  },
  primaryBtnText: {
    fontFamily: 'Georgia',
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1000',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  secondaryBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.borderDormant,
  },
  secondaryBtnText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '600',
    color: T.textSecondary,
    letterSpacing: 1,
  },
  dangerBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,68,102,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,68,102,0.2)',
  },
  dangerBtnText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '600',
    color: T.crimson,
    letterSpacing: 1,
  },

  // Progress bar
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: T.amber,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: T.borderDormant,
    marginVertical: 12,
  },
});

// ── Reusable components ──

/** Full-screen wood background with SafeAreaView */
export function ScreenBackground({ children }: { children: ReactNode }) {
  return (
    <ImageBackground source={woodBg} style={ts.root} resizeMode="cover" imageStyle={{ opacity: 0.6 }}>
      <SafeAreaView style={ts.safeArea}>
        {children}
      </SafeAreaView>
    </ImageBackground>
  );
}

/** Parchment-textured card */
export function ParchmentCard({
  children,
  style,
  opacity = 0.35,
}: {
  children: ReactNode;
  style?: ViewStyle | (ViewStyle | false | null | undefined)[];
  opacity?: number;
}) {
  return (
    <ImageBackground
      source={parchmentBg}
      resizeMode="cover"
      style={[ts.card, ...(Array.isArray(style) ? style : style ? [style] : [])]}
      imageStyle={{ borderRadius: 9, opacity }}
    >
      {children}
    </ImageBackground>
  );
}

/** Back button */
export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 12 }}>
      <Text style={{ fontFamily: 'monospace', fontSize: 12, color: T.textSecondary }}>
        {'\u2190'} Back
      </Text>
    </Pressable>
  );
}

/** Decorative header with diamond line */
export function PageHeader({
  title,
  subtitle,
  accentWord,
}: {
  title: string;
  subtitle?: string;
  accentWord?: string;
}) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <View style={{ width: 30, height: 1, backgroundColor: `${T.amber}30` }} />
        <Text style={{ fontSize: 7, color: `${T.amber}50` }}>{'\u25C6'}</Text>
        <View style={{ width: 30, height: 1, backgroundColor: `${T.amber}30` }} />
      </View>
      <Text style={ts.pageTitle}>
        {accentWord ? title.replace(accentWord, '') : title}
        {accentWord && <Text style={{ color: T.amber }}>{accentWord}</Text>}
      </Text>
      {subtitle && <Text style={ts.pageSub}>{subtitle}</Text>}
    </View>
  );
}

/** Menu row with icon */
export function MenuRow({
  icon,
  label,
  onPress,
  color,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            paddingVertical: 14,
            paddingHorizontal: 14,
            marginBottom: 8,
            borderRadius: 10,
            backgroundColor: pressed ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.025)',
            borderWidth: 1,
            borderColor: pressed ? T.borderAlive : T.borderDormant,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${color ?? T.textMuted}12`,
            }}
          >
            <Text style={{ fontSize: 16, color: color ?? T.textMuted }}>
              {icon}
            </Text>
          </View>
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: T.textPrimary }}>
            {label}
          </Text>
          <Text style={{ fontSize: 18, color: T.textMuted }}>{'\u203A'}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Stat box used in grids */
export function StatBox({
  label,
  value,
  color,
  style,
}: {
  label: string;
  value: string | number;
  color?: string;
  style?: ViewStyle;
}) {
  return (
    <ParchmentCard style={[{ flex: 1, alignItems: 'center' as const, padding: 12 }, style ?? {}]} opacity={0.25}>
      <Text style={ts.cardLabel}>{label}</Text>
      <Text style={[ts.cardValue, color ? { color } : null]}>{value}</Text>
    </ParchmentCard>
  );
}

/** Corner marks on cards */
export function CornerMarks() {
  return (
    <>
      <CornerMark position="tl" />
      <CornerMark position="tr" />
      <CornerMark position="br" />
      <CornerMark position="bl" />
    </>
  );
}

function CornerMark({ position }: { position: 'tl' | 'tr' | 'br' | 'bl' }) {
  const base: ViewStyle = { position: 'absolute', width: 14, height: 14 };
  const pos: ViewStyle =
    position === 'tl' ? { top: -1, left: -1 } :
    position === 'tr' ? { top: -1, right: -1 } :
    position === 'br' ? { bottom: -1, right: -1 } :
    { bottom: -1, left: -1 };
  const hBar: ViewStyle = {
    position: 'absolute', height: 2, width: 10,
    backgroundColor: T.amber, opacity: 0.35,
    ...(position === 'tl' || position === 'tr' ? { top: 0 } : { bottom: 0 }),
    ...(position === 'tl' || position === 'bl' ? { left: 0 } : { right: 0 }),
  };
  const vBar: ViewStyle = {
    position: 'absolute', width: 2, height: 10,
    backgroundColor: T.amber, opacity: 0.35,
    ...(position === 'tl' || position === 'bl' ? { left: 0 } : { right: 0 }),
    ...(position === 'tl' || position === 'tr' ? { top: 0 } : { bottom: 0 }),
  };
  const dot: ViewStyle = {
    position: 'absolute', width: 3, height: 3, borderRadius: 1.5,
    backgroundColor: T.amber, opacity: 0.5,
    ...(position === 'tl' || position === 'tr' ? { top: 0 } : { bottom: 0 }),
    ...(position === 'tl' || position === 'bl' ? { left: 0 } : { right: 0 }),
  };

  return (
    <View style={[base, pos]} pointerEvents="none">
      <View style={hBar} />
      <View style={vBar} />
      <View style={dot} />
    </View>
  );
}
