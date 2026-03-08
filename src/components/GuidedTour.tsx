import { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { T } from '@/theme';

export interface TourStep {
  viewpoint: string;
  icon: string;
  title: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    viewpoint: 'overview',
    icon: '\u2302',
    title: 'Welcome to the Dungeon',
    description:
      'This is your personal study chamber. Each object in the room is interactive — tap them to access different features.',
  },
  {
    viewpoint: 'bookshelf',
    icon: '\u{1F4DA}',
    title: 'The Bookshelf',
    description:
      'Your course library. Tap to view your active course, track lesson progress, and start the next lesson.',
  },
  {
    viewpoint: 'alchemy',
    icon: '\u2697',
    title: 'The Alchemy Table',
    description:
      'Brew fuel into Ichor here. Choose a brew duration — longer brews yield more Ichor per hour. Fuel is earned by completing lessons.',
  },
  {
    viewpoint: 'bookshelf',
    icon: '\u{1F525}',
    title: 'The Oil Lamps',
    description:
      'These lamps represent your streak. Complete a lesson each day to keep them lit. After Day 8 you unlock 3 savers for missed days.',
  },
  {
    viewpoint: 'overview',
    icon: '\u{1F4E6}',
    title: 'The Chest',
    description:
      'Your inventory. View your fuel balance, Ichor reserves, and saver count at a glance.',
  },
  {
    viewpoint: 'noticeboard',
    icon: '\u2694',
    title: 'The Notice Board',
    description:
      'Community leaderboard. See how your streak and progress compare against other learners.',
  },
  {
    viewpoint: 'overview',
    icon: '\u{1F464}',
    title: 'Profile Button',
    description:
      'Tap the icon in the top-right corner to manage your courses, view stats, access the Ichor Shop, or resurface your locked funds.',
  },
];

interface GuidedTourProps {
  onStepChange: (viewpoint: string) => void;
  onComplete: () => void;
}

export function GuidedTour({ onStepChange, onComplete }: GuidedTourProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const mounted = useRef(false);

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  // Fade in backdrop on mount (independent of card animation)
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setVisible(true);
    });
  }, [fadeAnim]);

  // Animate card on step change (including initial mount)
  useEffect(() => {
    cardAnim.setValue(0);
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: mounted.current ? 350 : 500,
      useNativeDriver: true,
    }).start();
    mounted.current = true;
    onStepChange(current.viewpoint);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = () => {
    if (isLast) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onComplete());
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => onComplete());
  };

  const cardTranslateY = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  return (
    <Animated.View
      style={[s.overlay, { opacity: fadeAnim }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Dimmed background — tappable to advance */}
      <Pressable style={s.backdrop} onPress={handleNext} />

      {/* Tooltip card */}
      <Animated.View
        style={[
          s.card,
          {
            opacity: cardAnim,
            transform: [{ translateY: cardTranslateY }],
          },
        ]}
      >
        {/* Step indicator */}
        <View style={s.stepIndicator}>
          {TOUR_STEPS.map((_, i) => (
            <View
              key={i}
              style={[s.dot, i === step ? s.dotActive : {}]}
            />
          ))}
        </View>

        {/* Icon */}
        <Text style={s.icon}>{current.icon}</Text>

        {/* Title */}
        <Text style={s.title}>{current.title}</Text>

        {/* Description */}
        <Text style={s.description}>{current.description}</Text>

        {/* Buttons */}
        <View style={s.buttonRow}>
          <Pressable onPress={handleSkip}>
            <View style={s.skipBtn}>
              <Text style={s.skipBtnText}>Skip Tour</Text>
            </View>
          </Pressable>

          <Pressable onPress={handleNext}>
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

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'flex-end',
    paddingBottom: 60,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(14,14,28,0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${T.amber}30`,
    padding: 24,
    alignItems: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 18,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dotActive: {
    backgroundColor: T.amber,
    width: 18,
    borderRadius: 3,
  },
  icon: {
    fontSize: 36,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Georgia',
    fontSize: 20,
    fontWeight: '700',
    color: T.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: T.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.borderDormant,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  skipBtnText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '600',
    color: T.textMuted,
    letterSpacing: 0.5,
  },
  nextBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: T.amber,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8B860',
  },
  nextBtnText: {
    fontFamily: 'Georgia',
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1000',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
