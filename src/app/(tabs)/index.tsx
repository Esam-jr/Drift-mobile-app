import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Sparkles, Plus, Search, Filter } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeContext';
import { DriftTokens } from '@/theme/tokens';
import { Moment, Category, DateGroupedMoments } from '@/types/moment';
import { getAllMoments, getCategories, groupMomentsByDate } from '@/services/db/momentRepository';
import { DriftText } from '@/components/ui/DriftText';
import { MomentCard } from '@/components/moment/MomentCard';
import { EmptyState } from '@/components/ui/EmptyState';

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const [dateGroups, setDateGroups] = useState<DateGroupedMoments[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    try {
      const [allMoments, allCategories] = await Promise.all([
        getAllMoments(selectedCategoryId ? { categoryId: selectedCategoryId } : undefined),
        getCategories(),
      ]);
      setCategories(allCategories);
      const grouped = groupMomentsByDate(allMoments);
      setDateGroups(grouped);
    } catch (err) {
      console.warn('Error loading moments:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCategoryId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleCategoryFilter = (catId: string | null) => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    setSelectedCategoryId(catId);
  };

  const handleOpenCapture = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}
    router.push('/capture');
  };

  const totalMomentsCount = dateGroups.reduce((acc, g) => acc + g.moments.length, 0);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Editorial Top Bar */}
        <View style={styles.topBar}>
          <View>
            <DriftText variant="display" color="primary" style={styles.appTitle}>
              Drift
            </DriftText>
            <DriftText variant="caption" color="tertiary" style={styles.dateSub}>
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </DriftText>
          </View>
        </View>

        {/* Category Filters Pill Strip */}
        <View style={styles.filterStripContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterStrip}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleCategoryFilter(null)}
              style={[
                styles.categoryPill,
                {
                  backgroundColor: selectedCategoryId === null ? theme.textPrimary : theme.surface,
                  borderColor: selectedCategoryId === null ? theme.textPrimary : theme.borderSubtle,
                },
              ]}
            >
              <DriftText
                variant="caption"
                style={{
                  color: selectedCategoryId === null ? theme.background : theme.textSecondary,
                  fontWeight: selectedCategoryId === null ? '600' : '400',
                }}
              >
                All
              </DriftText>
            </TouchableOpacity>

            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.7}
                  onPress={() => handleCategoryFilter(cat.id)}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: isSelected ? theme.textPrimary : theme.surface,
                      borderColor: isSelected ? theme.textPrimary : theme.borderSubtle,
                    },
                  ]}
                >
                  <DriftText
                    variant="caption"
                    style={{
                      color: isSelected ? theme.background : theme.textSecondary,
                      fontWeight: isSelected ? '600' : '400',
                    }}
                  >
                    {cat.name}
                  </DriftText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Main Feed */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.feedContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.accent}
            />
          }
        >
          {totalMomentsCount === 0 && !loading ? (
            <EmptyState onCapturePress={handleOpenCapture} />
          ) : (
            dateGroups.map((group) => (
              <View key={group.dateLabel} style={styles.dateSection}>
                <View style={styles.dateHeaderRow}>
                  <DriftText variant="headline" color="primary" style={styles.dateLabel}>
                    {group.dateLabel}
                  </DriftText>
                  <View style={[styles.dateDivider, { backgroundColor: theme.borderSubtle }]} />
                </View>

                {group.moments.map((moment) => (
                  <MomentCard key={moment.id} moment={moment} />
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  appTitle: {
    letterSpacing: -1,
  },
  dateSub: {
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '500',
  },
  filterStripContainer: {
    paddingVertical: 8,
  },
  filterStrip: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryPill: {
    paddingVertical: 7,
    paddingHorizontal: 15,
    borderRadius: DriftTokens.radius.full,
    borderWidth: 1,
  },
  feedContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  dateSection: {
    marginTop: 16,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  dateDivider: {
    flex: 1,
    height: 1,
    marginLeft: 12,
  },
});
