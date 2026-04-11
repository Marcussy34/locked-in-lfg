import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Dimensions } from 'react-native';
import { T } from '@/theme';

// ---------------------------------------------------------------------------
// Tour step definitions (same as web)
// ---------------------------------------------------------------------------
interface TourStep {
  objectId: string;
  icon: string;
  title: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    objectId: 'bookshelf',
    icon: '\u{1F4DA}',
    title: 'The Bookshelf',
    description:
      'Your course library. Tap to browse courses, track progress, and start your next lesson.',
  },
  {
    objectId: 'oil_lamp_center',
    icon: '\u{1F525}',
    title: 'The Oil Lamps',
    description:
      'Your streak savers. Complete one lesson and all three light up \u2014 miss a day and you lose one. Run out, and your streak resets.',
  },
  {
    objectId: 'old_chest',
    icon: '\u{1F4E6}',
    title: 'The Chest',
    description:
      'Your inventory. Check fuel balance, Ichor reserves, and saver count at a glance.',
  },
  {
    objectId: 'alchemy_table',
    icon: '\u2697',
    title: 'The Alchemy Table',
    description:
      'Brew fuel into Ichor here. Ichor can be claimed as USDC once your lock period ends. Fuel is earned from lessons.',
  },
];

const BUBBLE_W = 290;
const GAP = 20;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface DungeonTourProps {
  sendMessage: (type: string, payload: Record<string, any>) => void;
  onMessage: (handler: (data: any) => void) => () => void;
  onComplete: () => void;
}

export function DungeonTour({ sendMessage, onMessage, onComplete }: DungeonTourProps) {
  const [step, setStep] = useState(0);
  const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [ready, setReady] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const mounted = useRef(false);

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  // Fade in backdrop on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Animate card on step change
  useEffect(() => {
    cardAnim.setValue(0);
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: mounted.current ? 350 : 500,
      useNativeDriver: true,
    }).start();
    mounted.current = true;
  }, [step, cardAnim]);

  // Listen for tourScreenPos messages
  useEffect(() => {
    return onMessage((data: any) => {
      if (data.type === 'tourScreenPos') {
        const payload = data.payload;
        if (payload) setScreenPos({ x: payload.x, y: payload.y });
      }
    });
  }, [onMessage]);

  // Init highlight layer + highlight first object
  useEffect(() => {
    sendMessage('tourInit', {});
    const t = setTimeout(() => {
      sendMessage('tourHighlight', { objectId: TOUR_STEPS[0].objectId });
      setReady(true);
    }, 200);
    return () => clearTimeout(t);
  }, [sendMessage]);

  // Highlight current step's object
  useEffect(() => {
    if (!ready) return;
    sendMessage('tourClearHighlight', {});
    const t = setTimeout(() => {
      sendMessage('tourHighlight', { objectId: current.objectId });
    }, 80);
    return () => clearTimeout(t);
  }, [step, ready, current.objectId, sendMessage]);

  const handleNext = useCallback(() => {
    if (isLast) {
      sendMessage('tourClearHighlight', {});
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onComplete());
    } else {
      setScreenPos(null);
      setStep((s) => s + 1);
    }
  }, [isLast, sendMessage, fadeAnim, onComplete]);

  const handleSkip = useCallback(() => {
    sendMessage('tourClearHighlight', {});
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => onComplete());
  }, [sendMessage, fadeAnim, onComplete]);

  // Compute bubble position
  const { width: screenW, height: screenH } = Dimensions.get('window');
  const bubblePos = screenPos
    ? computeBubblePos(screenPos, screenW, screenH)
    : { left: (screenW - BUBBLE_W) / 2, top: screenH * 0.35 };

  const cardTranslateY = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  return (
    <Animated.View style={[s.overlay, { opacity: fadeAnim }]}>
      {/* Dim backdrop */}
      <Pressable style={s.backdrop} onPress={handleNext} />

      {/* Tooltip card */}
      <Animated.View
        style={[
          s.card,
          {
            width: BUBBLE_W,
            left: bubblePos.left,
            top: bubblePos.top,
            opacity: cardAnim,
            transform: [{ translateY: cardTranslateY }],
          },
        ]}
      >
        {/* Step dots */}
        <View style={s.stepDots}>
          {TOUR_STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                i === step ? s.dotActive : i < step ? s.dotDone : {},
              ]}
            />
          ))}
        </View>

        {/* Header */}
        <View style={s.header}>
          <View style={s.iconBox}>
            <Text style={s.iconText}>{current.icon}</Text>
          </View>
          <View>
            <Text style={s.stepLabel}>
              Step {step + 1} of {TOUR_STEPS.length}
            </Text>
            <Text style={s.title}>{current.title}</Text>
          </View>
        </View>

        {/* Description */}
        <Text style={s.description}>{current.description}</Text>

        {/* Buttons */}
        <View style={s.buttonRow}>
          <Pressable onPress={handleSkip}>
            <View style={s.skipBtn}>
              <Text style={s.skipBtnText}>Skip</Text>
            </View>
          </Pressable>
          <Pressable onPress={handleNext} style={{ flex: 1 }}>
            <View style={s.nextBtn}>
              <Text style={s.nextBtnText}>
                {isLast ? 'Get Started' : 'Next'}
              </Text>
            </View>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Position helper
// ---------------------------------------------------------------------------
function computeBubblePos(
  pos: { x: number; y: number },
  screenW: number,
  screenH: number,
): { left: number; top: number } {
  const objPxX = pos.x * screenW;
  const objPxY = pos.y * screenH;

  let left: number;
  if (pos.x > 0.5) {
    left = objPxX - BUBBLE_W - GAP;
  } else {
    left = objPxX + GAP;
  }
  let top = objPxY - 28;

  // Clamp
  left = Math.max(10, Math.min(left, screenW - BUBBLE_W - 10));
  top = Math.max(10, Math.min(top, screenH - 280));

  return { left, top };
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    position: 'absolute',
    backgroundColor: 'rgba(14,14,28,0.96)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${T.amber}59`,
    padding: 20,
  },
  stepDots: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dotActive: {
    backgroundColor: T.amber,
    width: 20,
  },
  dotDone: {
    backgroundColor: `${T.amber}59`,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: `${T.amber}1a`,
    borderWidth: 1,
    borderColor: `${T.amber}2e`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
  },
  stepLabel: {
    fontFamily: 'monospace',
    fontSize: 9.5,
    fontWeight: '600',
    color: `${T.amber}8c`,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  title: {
    fontFamily: 'Georgia',
    fontSize: 16,
    fontWeight: '700',
    color: '#F0E6D3',
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(240,230,211,0.65)',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  skipBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  skipBtnText: {
    fontFamily: 'monospace',
    fontSize: 10.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.5,
  },
  nextBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 7,
    backgroundColor: T.amber,
    borderWidth: 1,
    borderColor: '#E8B860',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: {
    fontFamily: 'Georgia',
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1A1000',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
