import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Search as SearchIcon, X } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing, radius, hitSlop } from '@/theme/tokens';
import { Moment, Category } from '@/types/moment';
import {
  getAllMoments,
  getCategories,
  groupMomentsByDate,
} from '@/services/db/momentRepository';
import { MomentRow } from '@/components/moment/MomentRow';
import { Mote } from '@/components/Mote';

type FlatItem =
  | { kind: 'dayHeading'; label: string; key: string }
  | { kind: 'moment'; moment: Moment; key: string };

export default function SearchScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [results, setResults] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto-focus search input
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  // Load categories
  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => console.warn('Could not load categories in search:', err));
  }, []);

  // Perform search query
  const performSearch = useCallback(async () => {
    setLoading(true);
    try {
      const moments = await getAllMoments({
        search: query.trim() || undefined,
        categoryId: selectedCategoryId || undefined,
      });
      setResults(moments);
    } catch (err) {
      console.warn('Error querying moments:', err);
    } finally {
      setLoading(false);
    }
  }, [query, selectedCategoryId]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  // Group filtered results by date
  const grouped = groupMomentsByDate(results);
  const flatItems: FlatItem[] = [];
  for (const group of grouped) {
    flatItems.push({
      kind: 'dayHeading',
      label: group.dateLabel,
      key: `heading-${group.timestamp}`,
    });
    for (const m of group.moments) {
      flatItems.push({ kind: 'moment', moment: m, key: m.id });
    }
  }

  const renderItem = ({ item }: { item: FlatItem }) => {
    if (item.kind === 'dayHeading') {
      return (
        <Text style={[typeTokens.dayHeading, styles.dayHeading, { color: colors.text }]}>
          {item.label}
        </Text>
      );
    }
    return (
      <MomentRow
        moment={item.moment}
        highlightQuery={query.trim()}
        onDeleted={performSearch}
      />
    );
  };

  const countLabel = `${results.length} ${results.length === 1 ? 'moment' : 'moments'}`;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.container}>
        {/* Top search bar: back chevron + auto-focused search field */}
        <View style={styles.searchHeader}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            accessibilityLabel="Back"
            hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color={colors.text} strokeWidth={1.8} />
          </TouchableOpacity>

          <View style={[styles.searchField, { backgroundColor: colors.surface }]}>
            <SearchIcon size={18} color={colors.muted} strokeWidth={1.8} style={{ marginRight: spacing.sm }} />
            <TextInput
              ref={inputRef}
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Search moments..."
              placeholderTextColor={colors.muted}
              returnKeyType="search"
              style={[typeTokens.ui, styles.searchInput, { color: colors.text }]}
            />
            {query.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setQuery('')}
                accessibilityLabel="Clear search"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category chips: "All" plus each category per DESIGN.md §6.7 */}
        <View style={styles.chipsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedCategoryId(null)}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    selectedCategoryId === null ? colors.accent + '20' : colors.surface,
                },
              ]}
            >
              <Text
                style={[
                  typeTokens.meta,
                  {
                    color: selectedCategoryId === null ? colors.accent : colors.muted,
                  },
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.7}
                  onPress={() =>
                    setSelectedCategoryId(isSelected ? null : cat.id)
                  }
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? colors.accent + '20' : colors.surface,
                    },
                  ]}
                >
                  <View style={[styles.glowDot, { backgroundColor: colors.glow }]} />
                  <Text
                    style={[
                      typeTokens.meta,
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

        {/* Results or Empty Results */}
        {!loading && results.length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Mote state="rest" size={90} label="Nothing matches that yet" />
            <Text style={[typeTokens.prompt, styles.noResultsText, { color: colors.muted }]}>
              Nothing matches that yet.
            </Text>
          </View>
        ) : (
          <FlatList
            data={flatItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.feedContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Count line at bottom per DESIGN.md §6.7 */}
        {results.length > 0 && (
          <View style={[styles.bottomBar, { backgroundColor: colors.bg, borderTopColor: colors.hairline }]}>
            <Text style={[typeTokens.meta, { color: colors.muted }]}>
              {countLabel}
            </Text>
          </View>
        )}
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
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  searchField: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    padding: 0,
  },
  chipsContainer: {
    paddingVertical: spacing.xs,
  },
  chipsRow: {
    paddingHorizontal: spacing.screen,
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  glowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  feedContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: 60,
    paddingTop: spacing.sm,
  },
  dayHeading: {
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  noResultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screen,
  },
  noResultsText: {
    marginTop: spacing.md,
    textAlign: 'center',
    fontSize: 18,
  },
  bottomBar: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
