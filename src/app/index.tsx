import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Search, Settings, Mic, BookOpen, LayoutGrid, Rows3 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing, radius, motion } from '@/theme/tokens';
import { Section, Category, HomeLayout } from '@/types/moment';
import { getGroupedMomentPreviews, getCategories, deleteMoment } from '@/services/db/momentRepository';
import { getSavedHomeLayout, saveHomeLayout } from '@/services/preferences/preferencesService';
import { seedSampleMoments } from '@/services/db/seedMoments';
import { JournalLayout } from '@/components/home/JournalLayout';
import { CompactLayout } from '@/components/home/CompactLayout';
import { GalleryLayout } from '@/components/home/GalleryLayout';
import { EmptyState } from '@/components/ui/EmptyState';

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [sections, setSections] = useState<Section[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeLayout, setActiveLayout] = useState<HomeLayout>('journal');
  const [loading, setLoading] = useState(true);
  const [totalMomentsCount, setTotalMomentsCount] = useState(0);

  // Crossfade animation & scroll anchoring per DESIGN-home.md §2
  const layoutFadeAnim = useRef(new Animated.Value(1)).current;
  const anchorMomentIdRef = useRef<string | null>(null);

  // Load categories once
  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => console.warn('Could not load categories:', err));
  }, []);

  const loadData = useCallback(async () => {
    try {
      const data = await getGroupedMomentPreviews({
        categoryId: selectedCategoryId || undefined,
      });
      setSections(data);

      // Track total moment count across sections
      const count = data.reduce((sum, s) => sum + s.moments.length, 0);
      setTotalMomentsCount(count);
    } catch (err) {
      console.warn('Error loading moments:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      getSavedHomeLayout().then((saved) => {
        setActiveLayout(saved);
      });
    }, [loadData])
  );

  /**
   * Switches layout with a 160ms crossfade (motion.fast) per DESIGN-home.md §2:
   * "Changing layout crossfades over motion.fast (160ms). No slide.
   * The scroll position is kept by anchoring on the first visible moment's id."
   */
  const handleSwitchLayout = (newLayout: HomeLayout) => {
    if (newLayout === activeLayout) return;

    try {
      Haptics.selectionAsync();
    } catch (_) {}

    Animated.timing(layoutFadeAnim, {
      toValue: 0,
      duration: motion.fast / 2, // 80ms fade-out
      useNativeDriver: true,
    }).start(() => {
      setActiveLayout(newLayout);
      saveHomeLayout(newLayout);
      Animated.timing(layoutFadeAnim, {
        toValue: 1,
        duration: motion.fast / 2, // 80ms fade-in
        useNativeDriver: true,
      }).start();
    });
  };

  const handleCategoryPress = (catId: string | null) => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    setSelectedCategoryId(catId);
  };

  const openCapture = () => router.push('/capture');
  const openCaptureRecording = () => router.push({ pathname: '/capture', params: { autoRecord: '1' } });
  const openMoment = (id: string) => router.push({ pathname: '/moment/[id]', params: { id } });
  const openEdit = (id: string) => router.push({ pathname: '/capture', params: { editId: id } });

  const handleDeleteMoment = async (id: string) => {
    try {
      await deleteMoment(id);
      await loadData();
    } catch (err) {
      console.warn('Error deleting moment:', err);
    }
  };

  const handleVisibleMomentChange = useCallback((id: string) => {
    anchorMomentIdRef.current = id;
  }, []);

  const hasAnyMomentsInDb = totalMomentsCount > 0 || !!selectedCategoryId;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Top bar per DESIGN-home.md §2 */}
        <View style={styles.topBar}>
          {/* Left: Layout switcher segmented control */}
          <View style={[styles.layoutSwitcher, { backgroundColor: colors.surface }]}>
            {/* Journal button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleSwitchLayout('journal')}
              accessibilityLabel="Journal view"
              accessibilityRole="tab"
              accessibilityState={{ selected: activeLayout === 'journal' }}
              style={styles.switcherTouchTarget}
            >
              <View
                style={[
                  styles.switcherVisualCircle,
                  activeLayout === 'journal' && { backgroundColor: colors.accent },
                ]}
              >
                <BookOpen
                  size={15}
                  color={activeLayout === 'journal' ? colors.onAccent : colors.muted}
                  strokeWidth={1.8}
                />
              </View>
            </TouchableOpacity>

            {/* Gallery button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleSwitchLayout('gallery')}
              accessibilityLabel="Gallery view"
              accessibilityRole="tab"
              accessibilityState={{ selected: activeLayout === 'gallery' }}
              style={styles.switcherTouchTarget}
            >
              <View
                style={[
                  styles.switcherVisualCircle,
                  activeLayout === 'gallery' && { backgroundColor: colors.accent },
                ]}
              >
                <LayoutGrid
                  size={15}
                  color={activeLayout === 'gallery' ? colors.onAccent : colors.muted}
                  strokeWidth={1.8}
                />
              </View>
            </TouchableOpacity>

            {/* Compact button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleSwitchLayout('compact')}
              accessibilityLabel="Compact view"
              accessibilityRole="tab"
              accessibilityState={{ selected: activeLayout === 'compact' }}
              style={styles.switcherTouchTarget}
            >
              <View
                style={[
                  styles.switcherVisualCircle,
                  activeLayout === 'compact' && { backgroundColor: colors.accent },
                ]}
              >
                <Rows3
                  size={15}
                  color={activeLayout === 'compact' ? colors.onAccent : colors.muted}
                  strokeWidth={1.8}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Right: Search and Settings */}
          <View style={styles.rightIcons}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/search')}
              accessibilityLabel="Search"
              style={styles.iconBtn}
            >
              <Search size={20} color={colors.muted} strokeWidth={1.8} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/settings')}
              accessibilityLabel="Settings"
              style={styles.iconBtn}
            >
              <Settings size={20} color={colors.muted} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category chips row per DESIGN-home.md §2 */}
        <View style={styles.chipsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContent}
          >
            {/* "All" chip */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleCategoryPress(null)}
              accessibilityLabel="All categories"
              style={[
                styles.categoryChip,
                {
                  backgroundColor: selectedCategoryId === null ? colors.accent + '25' : colors.surface,
                },
              ]}
            >
              <Text
                style={[
                  selectedCategoryId === null ? typeTokens.uiMedium : typeTokens.ui,
                  {
                    color: selectedCategoryId === null ? colors.accent : colors.muted,
                  },
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            {/* Individual category chips */}
            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.7}
                  onPress={() => handleCategoryPress(cat.id)}
                  accessibilityLabel={cat.name}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected ? colors.accent + '25' : colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      isSelected ? typeTokens.uiMedium : typeTokens.ui,
                      {
                        color: isSelected ? colors.accent : colors.muted,
                      },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Layout content or Empty state with 160ms crossfade per DESIGN-home.md §2 */}
        {!loading && !hasAnyMomentsInDb ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              onSeed={async () => {
                setLoading(true);
                await seedSampleMoments(150);
                await loadData();
              }}
            />
          </View>
        ) : (
          <Animated.View style={[styles.layoutContainer, { opacity: layoutFadeAnim }]}>
            {activeLayout === 'compact' ? (
              <CompactLayout
                sections={sections}
                onOpenMoment={openMoment}
                onEditMoment={openEdit}
                onDeleteMoment={handleDeleteMoment}
                hasActiveFilter={!!selectedCategoryId}
                anchorMomentId={anchorMomentIdRef.current}
                onVisibleMomentChange={handleVisibleMomentChange}
              />
            ) : activeLayout === 'gallery' ? (
              <GalleryLayout
                sections={sections}
                onOpenMoment={openMoment}
                onEditMoment={openEdit}
                onDeleteMoment={handleDeleteMoment}
                hasActiveFilter={!!selectedCategoryId}
                anchorMomentId={anchorMomentIdRef.current}
                onVisibleMomentChange={handleVisibleMomentChange}
              />
            ) : (
              <JournalLayout
                sections={sections}
                onOpenMoment={openMoment}
                onEditMoment={openEdit}
                onDeleteMoment={handleDeleteMoment}
                hasActiveFilter={!!selectedCategoryId}
                anchorMomentId={anchorMomentIdRef.current}
                onVisibleMomentChange={handleVisibleMomentChange}
              />
            )}
          </Animated.View>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  layoutSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    padding: 2,
  },
  switcherTouchTarget: {
    width: 44, // 44pt touch target per DESIGN-home.md §2
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switcherVisualCircle: {
    width: 28, // 28pt visual circle per DESIGN-home.md §2
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsWrapper: {
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  chipsContent: {
    paddingHorizontal: spacing.screen,
    gap: spacing.xs,
    alignItems: 'center',
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  layoutContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
