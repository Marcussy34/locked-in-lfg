import { useRef, useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Pressable, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@/navigation/types';
import { useFlameStore, useSceneStore, useStreakStore, useTokenStore, useBrewStore, useUserStore } from '@/stores';
import { useCourseStore } from '@/stores/courseStore';

type HubNav = NativeStackNavigationProp<MainStackParamList>;

const DUNGEON_ASSET = require('../../../web/dungeon/dist/index.html');

function getDevHost(): string {
  try {
    const debuggerHost =
      Constants.expoConfig?.hostUri ??
      (Constants.manifest2 as any)?.extra?.expoGo?.debuggerHost ??
      (Constants.manifest as any)?.debuggerHost;
    if (debuggerHost) {
      const ip = debuggerHost.split(':')[0];
      if (ip) return ip;
    }
  } catch {}
  return '192.168.1.103';
}

const DEV_URI = `http://${getDevHost()}:5173`;
const IS_DEV = __DEV__;

export function UndergroundHubScreen() {
  const navigation = useNavigation<HubNav>();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [bookModalVisible, setBookModalVisible] = useState(false);

  // Store subscriptions
  const flameState = useFlameStore((s) => s.flameState);
  const lightIntensity = useFlameStore((s) => s.lightIntensity);
  const currentViewpoint = useSceneStore((s) => s.currentViewpoint);
  const roomPhase = useSceneStore((s) => s.roomPhase);
  const currentStreak = useStreakStore((s) => s.currentStreak);

  // Course store subscriptions
  const activeCourseId = useCourseStore((s) => s.activeCourseId);
  const activeCourseIds = useCourseStore((s) => s.activeCourseIds);

  // Initialize mock data
  useCourseStore.getState().initializeMockData();

  // Guard: if no active courses, redirect to CourseBrowser
  useEffect(() => {
    if (activeCourseIds.length === 0) {
      navigation.replace('CourseBrowser');
    }
  }, [activeCourseIds.length, navigation]);

  // Helper: send message to WebView
  const sendToWebView = useCallback((type: string, payload: Record<string, any>) => {
    const msg = JSON.stringify({ type, payload });
    webViewRef.current?.injectJavaScript(
      `window.dispatchBridgeMessage('${msg.replace(/'/g, "\\'")}'); true;`
    );
  }, []);

  // Send initial state once scene is ready
  useEffect(() => {
    if (!sceneReady) return;
    sendToWebView('initState', {
      flameState,
      lightIntensity,
      viewpoint: currentViewpoint,
      roomPhase,
      streak: currentStreak,
    });
  }, [sceneReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync flame state changes
  useEffect(() => {
    if (!sceneReady) return;
    sendToWebView('flameState', { state: flameState, intensity: lightIntensity });
  }, [flameState, lightIntensity, sceneReady, sendToWebView]);

  // Sync viewpoint
  useEffect(() => {
    if (!sceneReady) return;
    sendToWebView('setViewpoint', { viewpoint: currentViewpoint });
  }, [currentViewpoint, sceneReady, sendToWebView]);

  // Sync room phase
  useEffect(() => {
    if (!sceneReady) return;
    sendToWebView('setRoomPhase', { phase: roomPhase });
  }, [roomPhase, sceneReady, sendToWebView]);

  // Handle messages from WebView
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        switch (data.type) {
          case 'console':
            console.log(`[WebView ${data.payload?.level}]`, data.payload?.message);
            break;

          case 'sceneReady':
            setSceneReady(true);
            break;

          case 'loadProgress':
            setLoadProgress(data.payload?.progress ?? 0);
            break;

          case 'objectTapped': {
            const objectId = data.payload?.objectId;
            switch (objectId) {
              case 'book':
              case 'bookshelf':
                setBookModalVisible(true);
                break;
              case 'alchemy':
              case 'alchemy_table':
              case 'alchemy_shelf':
              case 'alchemy_yield':
                navigation.navigate('Alchemy');
                break;
              case 'noticeboard':
                navigation.navigate('Leaderboard');
                break;
              case 'old_chest':
                navigation.navigate('Inventory');
                break;
              case 'oil_lamp_left':
              case 'oil_lamp_center':
              case 'oil_lamp_right':
                navigation.navigate('StreakStatus');
                break;
            }
            break;
          }

          case 'brewConfirmed': {
            const modeId = data.payload?.modeId;
            if (modeId) {
              const spent = useTokenStore.getState().spendTokens(1);
              if (spent) {
                useBrewStore.getState().startBrew(modeId);
                console.log('[Hub] Brew started:', modeId);
              } else {
                console.log('[Hub] Not enough M tokens to brew');
              }
            }
            break;
          }

          case 'brewCancelled':
            useBrewStore.getState().cancelBrew();
            console.log('[Hub] Brew cancelled');
            break;

          case 'viewpointChanged':
            if (data.payload?.viewpoint) {
              useSceneStore.getState().setViewpoint(data.payload.viewpoint);
            }
            break;
        }
      } catch {
        // ignore malformed messages
      }
    },
    [navigation],
  );

  const webviewSource = IS_DEV ? { uri: DEV_URI } : DUNGEON_ASSET;
  const [webviewError, setWebviewError] = useState<string | null>(null);
  console.log('[Hub] WebView source:', IS_DEV ? DEV_URI : 'bundled HTML');

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        style={styles.webview}
        source={webviewSource}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowUniversalAccessFromFileURLs
        mediaPlaybackRequiresUserAction={false}
        onMessage={handleMessage}
        onError={(e) => {
          const msg = `${e.nativeEvent.description} (code ${e.nativeEvent.code})`;
          console.warn('[Hub] WebView error:', msg);
          setWebviewError(msg);
        }}
        onHttpError={(e) => console.warn('[Hub] WebView HTTP error:', e.nativeEvent.statusCode, e.nativeEvent.url)}
        onLoadStart={() => console.log('[Hub] WebView loadStart')}
        onLoadEnd={() => console.log('[Hub] WebView loadEnd')}
        mixedContentMode="always"
        injectedJavaScript={`
          (function() {
            var origLog = console.log;
            var origErr = console.error;
            var origWarn = console.warn;
            function post(level, args) {
              try {
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
                  JSON.stringify({ type: 'console', payload: { level: level, message: Array.from(args).map(String).join(' ') } })
                );
              } catch(e) {}
            }
            console.log = function() { post('log', arguments); origLog.apply(console, arguments); };
            console.error = function() { post('error', arguments); origErr.apply(console, arguments); };
            console.warn = function() { post('warn', arguments); origWarn.apply(console, arguments); };
            window.onerror = function(msg, url, line) {
              post('error', ['UNCAUGHT: ' + msg + ' at ' + url + ':' + line]);
            };
            window.addEventListener('unhandledrejection', function(e) {
              post('error', ['UNHANDLED REJECTION: ' + (e.reason && e.reason.message || e.reason)]);
            });
          })();
          true;
        `}
      />

      {/* Loading overlay */}
      {!sceneReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ff8c42" />
          <Text style={styles.loadingText}>
            Loading dungeon... {Math.round(loadProgress * 100)}%
          </Text>
          {webviewError && (
            <Text style={styles.errorText}>{webviewError}</Text>
          )}
        </View>
      )}

      {/* Profile button (top-right) */}
      {sceneReady && (
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <Pressable
            style={styles.profileBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.profileBtnText}>{'\u2666'}</Text>
          </Pressable>
        </View>
      )}

      {/* Book modal */}
      <BookModal
        visible={bookModalVisible}
        onClose={() => setBookModalVisible(false)}
        onStartLesson={(lessonId, courseId) => {
          setBookModalVisible(false);
          navigation.navigate('Lesson', { lessonId, courseId });
        }}
        onBrowseCourses={() => {
          setBookModalVisible(false);
          navigation.navigate('CourseBrowser');
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Book Modal
// ---------------------------------------------------------------------------
function BookModal({
  visible,
  onClose,
  onStartLesson,
  onBrowseCourses,
}: {
  visible: boolean;
  onClose: () => void;
  onStartLesson: (lessonId: string, courseId: string) => void;
  onBrowseCourses: () => void;
}) {
  const activeCourseId = useCourseStore((s) => s.activeCourseId);
  const courses = useCourseStore((s) => s.courses);
  const lessons = useCourseStore((s) => s.lessons);
  const lessonProgress = useCourseStore((s) => s.lessonProgress);

  const course = activeCourseId
    ? courses.find((c) => c.id === activeCourseId) ?? null
    : courses[0] ?? null;
  const courseLessons = course
    ? (lessons[course.id] ?? []).sort((a, b) => a.order - b.order)
    : [];

  const nextLesson = courseLessons.find((l) => !lessonProgress[l.id]?.completed);
  const completedLessons = courseLessons.filter((l) => lessonProgress[l.id]?.completed);
  const lastCompleted = completedLessons.length > 0
    ? completedLessons[completedLessons.length - 1]
    : null;
  const lastScore = lastCompleted ? lessonProgress[lastCompleted.id]?.score : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={() => {}}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>
              {course?.title ?? 'No Course'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {course?.description ?? ''}
            </Text>

            <View style={styles.modalCard}>
              <Text style={styles.cardLabel}>Progress</Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: course
                        ? `${(course.completedLessons / course.totalLessons) * 100}%`
                        : '0%',
                    },
                  ]}
                />
              </View>
              <Text style={styles.cardMuted}>
                {course?.completedLessons ?? 0}/{course?.totalLessons ?? 0} lessons
              </Text>
            </View>

            <View style={styles.modalCard}>
              <Text style={styles.cardLabel}>Last Learned</Text>
              {lastCompleted ? (
                <>
                  <Text style={styles.cardValue}>{lastCompleted.title}</Text>
                  <Text style={styles.cardMuted}>
                    Score: {lastScore ?? 0}%
                  </Text>
                </>
              ) : (
                <Text style={styles.cardMuted}>No lessons completed yet</Text>
              )}
            </View>

            <View style={styles.actionGrid}>
              <Pressable style={styles.actionBtn} onPress={() => {}}>
                <Text style={styles.actionIcon}>{'\u{1F3CB}\uFE0F'}</Text>
                <Text style={styles.actionLabel}>Practice</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => {}}>
                <Text style={styles.actionIcon}>{'\u{1F9E9}'}</Text>
                <Text style={styles.actionLabel}>Puzzle</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => {}}>
                <Text style={styles.actionIcon}>{'\u{1F4D6}'}</Text>
                <Text style={styles.actionLabel}>Dictionary</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={onBrowseCourses}>
                <Text style={styles.actionIcon}>{'\u{1F4DA}'}</Text>
                <Text style={styles.actionLabel}>All Courses</Text>
              </Pressable>
            </View>

            {nextLesson ? (
              <Pressable
                style={styles.startBtn}
                onPress={() => onStartLesson(nextLesson.id, nextLesson.courseId)}
              >
                <Text style={styles.startBtnText}>
                  Start Lesson {nextLesson.order}: {nextLesson.title}
                </Text>
              </Pressable>
            ) : (
              <View style={[styles.startBtn, styles.startBtnDone]}>
                <Text style={styles.startBtnText}>All Lessons Complete!</Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050508',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050508',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    marginTop: 12,
  },
  errorText: {
    color: '#f44',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // ====== Top Bar (Profile only) ======
  topBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
  },
  profileBtn: {
    backgroundColor: 'rgba(20, 20, 22, 0.85)',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(60, 60, 64, 0.6)',
  },
  profileBtnText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '700',
  },

  // ====== Book Modal ======
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#141416',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderColor: '#2a2a2e',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#888',
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  modalCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a2e',
    padding: 16,
    marginTop: 16,
  },
  cardLabel: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  cardMuted: {
    color: '#666',
    fontSize: 13,
    marginTop: 4,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#2a2a2e',
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 3,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a2e',
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 20,
  },
  actionLabel: {
    color: '#999',
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
  },
  startBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  startBtnDone: {
    backgroundColor: '#166534',
  },
  startBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
