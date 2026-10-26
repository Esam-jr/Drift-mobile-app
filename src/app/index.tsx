import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Search, Settings, Mic } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing, radius, hitSlop, motion } from '@/theme/tokens';
import { Moment } from '@/types/moment';
import { getAllMoments, groupMomentsByDate } from '@/services/db/momentRepository';
import { MomentRow } from '@/components/moment/MomentRow';
import { EmptyState } from '@/components/ui/EmptyState';

type FlatItem =
  | { kind: 'dayHeading'; label: string; key: string }
  | { kind: 'moment'; moment: Moment; key: string };

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [items, setItems] = useState<FlatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const previousTopId = useRef<string | null>(null);

  // Top item fade-in animation over ~280ms per DESIGN.md §7
  const topItemFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const allMoments = await getAllMoments();
      const grouped = groupMomentsByDate(allMoments);
      const flat: FlatItem[] = [];

      for (const group of grouped) {
        flat.push({ kind: 'dayHeading', label: group.dateLabel, key: `heading-${group.timestamp}` });
        for (const m of group.moments) {
          flat.push({ kind: 'moment', moment: m, key: m.id });
        }
      }

      // Check if a new moment appeared at the top
      const firstMoment = flat.find((i) => i.kind === 'moment');
      if (firstMoment && previousTopId.current && firstMoment.key !== previousTopId.current) {
        if (!reduceMotion) {
          topItemFadeAnim.setValue(0);
          Animated.timing(topItemFadeAnim, {
            toValue: 1,
            duration: motion.base,
            useNativeDriver: true,
          }).start();
        }
      }
      if (firstMoment) {
        previousTopId.current = firstMoment.key;
      }

      setItems(flat);
    } catch (err) {
      console.warn('Error loading moments:', err);
    } finally {
      setLoading(false);
    }
  }, [reduceMotion, topItemFadeAnim]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const openCapture = () => router.push('/capture');
  const openCaptureRecording = () => router.push({ pathname: '/capture', params: { autoRecord: '1' } });

  const hasMoments = items.some((i) => i.kind === 'moment');

  const renderItem = ({ item, index }: { item: FlatItem; index: number }) => {
    if (item.kind === 'dayHeading') {
      return (
        <Text style={[typeTokens.dayHeading, styles.dayHeading, { color: colors.text }]}>
          {item.label}
        </Text>
      );
    }

    // Top moment fades in if newly added
    const isFirstMoment = index === 1 || (index === 0 && item.kind === 'moment');
    if (isFirstMoment) {
      return (
        <Animated.View style={{ opacity: topItemFadeAnim }}>
          <MomentRow moment={item.moment} onDeleted={loadData} />
        </Animated.View>
      );
    }

    return <MomentRow moment={item.moment} onDeleted={loadData} />;
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Top bar: search + settings icons at right per DESIGN.md §6.3 */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            activeOpacity={0.7}
            hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
            accessibilityLabel="Search"
            style={styles.iconBtn}
          >
            <Search size={20} color={colors.muted} strokeWidth={1.8} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/settings')}
            hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
            accessibilityLabel="Settings"
            style={styles.iconBtn}
          >
            <Settings size={20} color={colors.muted} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* Feed or Empty State */}
        {!loading && !hasMoments ? (
          <View style={styles.emptyContainer}>
            <EmptyState />
          </View>
        ) : (
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.feedContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Capture bar — fixed at bottom per DESIGN.md §6.3 */}
        <View style={[styles.captureBarOuter, { backgroundColor: colors.bg }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={openCapture}
            style={[styles.captureBar, { backgroundColor: colors.surface }]}
          >
            <Text style={[typeTokens.ui, styles.captureBarText, { color: colors.muted }]}>
              What's drifting through your mind?
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={openCaptureRecording}
              accessibilityLabel="Record"
              style={[styles.micButton, { backgroundColor: colors.accent }]}
            >
              <Mic size={18} color={colors.onAccent} strokeWidth={2} />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: 110, // clear the capture bar
    paddingTop: spacing.sm,
  },
  dayHeading: {
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  captureBarOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  captureBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    borderRadius: radius.pill,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
  },
  captureBarText: {
    flex: 1,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
