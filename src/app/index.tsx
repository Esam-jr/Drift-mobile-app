import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Search, Settings, Mic } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing, radius, hitSlop } from '@/theme/tokens';
import { Moment, DateGroupedMoments } from '@/types/moment';
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
      setItems(flat);
    } catch (err) {
      console.warn('Error loading moments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const openCapture = () => router.push('/capture');
  const openCaptureRecording = () => router.push({ pathname: '/capture', params: { autoRecord: '1' } });

  const hasMoments = items.some((i) => i.kind === 'moment');

  const renderItem = ({ item }: { item: FlatItem }) => {
    if (item.kind === 'dayHeading') {
      return (
        <Text style={[typeTokens.dayHeading, styles.dayHeading, { color: colors.text }]}>
          {item.label}
        </Text>
      );
    }
    return <MomentRow moment={item.moment} />;
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Top bar: search + settings icons at right */}
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

        {/* Capture bar — fixed at bottom */}
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
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
  },
  feedContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: 120,
  },
  dayHeading: {
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
  },
  captureBarOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.screen,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.lg,
    paddingTop: spacing.sm,
  },
  captureBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    height: 52,
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
