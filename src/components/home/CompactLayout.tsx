import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing, fonts } from '@/theme/tokens';
import { Section, MomentPreview } from '@/types/moment';
import { CompactRow } from './CompactRow';
import { ScrubRail } from './ScrubRail';

interface CompactLayoutProps {
  sections: Section[];
  onOpenMoment: (id: string) => void;
  onEditMoment: (id: string) => void;
  onDeleteMoment: (id: string) => void;
  hasActiveFilter?: boolean;
  anchorMomentId?: string | null;
  onVisibleMomentChange?: (id: string) => void;
}

interface SectionListData extends Section {
  data: MomentPreview[];
}

/**
 * Compact layout component per DESIGN-home.md §4:
 * - Single-line rows, minimum 48pt tall, hairline separators.
 * - Month rows are serif 18, muted, sticky.
 * - Virtualized via SectionList with memoized rows.
 * - Right edge scrub rail for fast jumping through months.
 */
export const CompactLayout: React.FC<CompactLayoutProps> = ({
  sections,
  onOpenMoment,
  onEditMoment,
  onDeleteMoment,
  hasActiveFilter,
  anchorMomentId,
  onVisibleMomentChange,
}) => {
  const { colors } = useTheme();
  const sectionListRef = useRef<SectionList<MomentPreview, SectionListData>>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  // Prepare section list data
  const sectionListData: SectionListData[] = useMemo(() => {
    return sections.map((s) => ({
      ...s,
      data: s.moments,
    }));
  }, [sections]);

  const handleScrollBegin = () => setIsScrolling(true);
  const handleScrollEnd = () => setIsScrolling(false);

  // Restore scroll position by anchoring on anchorMomentId per DESIGN-home.md §2
  useEffect(() => {
    if (!anchorMomentId) return;
    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const iIdx = sections[sIdx].moments.findIndex((m) => m.id === anchorMomentId);
      if (iIdx !== -1) {
        setTimeout(() => {
          try {
            sectionListRef.current?.scrollToLocation({
              sectionIndex: sIdx,
              itemIndex: iIdx,
              animated: false,
            });
          } catch (_) {}
        }, 50);
        break;
      }
    }
  }, [anchorMomentId, sections]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 10 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0 && viewableItems[0]?.item?.id) {
      onVisibleMomentChange?.(viewableItems[0].item.id);
    }
  }).current;

  const handleSelectSectionFromRail = useCallback((index: number) => {
    if (index >= 0 && index < sectionListData.length) {
      try {
        sectionListRef.current?.scrollToLocation({
          sectionIndex: index,
          itemIndex: 0,
          viewOffset: 0,
          animated: false,
        });
      } catch (err) {
        // Fallback if item layout is not measured yet
      }
    }
  }, [sectionListData.length]);

  // Month rows: serif 18, muted, sticky per DESIGN-home.md §4
  const renderSectionHeader = ({ section }: { section: SectionListData }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.bg }]}>
      <Text style={[styles.monthHeaderText, { color: colors.muted }]}>
        {section.label}
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: MomentPreview }) => {
    const dayNumber = `${new Date(item.createdAt).getDate()}`;

    return (
      <CompactRow
        moment={item}
        dayNumber={dayNumber}
        onPress={() => onOpenMoment(item.id)}
        onEdit={() => onEditMoment(item.id)}
        onDelete={() => onDeleteMoment(item.id)}
      />
    );
  };

  // Filter with no results per DESIGN-home.md §7:
  // "A filter with no results: plain muted text, 'Nothing in this category yet.' No Mote."
  if (sections.length === 0 && hasActiveFilter) {
    return (
      <View style={styles.filteredEmpty}>
        <Text style={[typeTokens.ui, { color: colors.muted }]}>
          Nothing in this category yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList<MomentPreview, SectionListData>
        ref={sectionListRef}
        sections={sectionListData}
        keyExtractor={(item) => item.id}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        stickySectionHeadersEnabled={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onScrollBeginDrag={handleScrollBegin}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollBegin={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
        initialNumToRender={25}
        maxToRenderPerBatch={25}
        windowSize={11}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
      />

      {/* Scrub rail on right edge */}
      <ScrubRail
        sections={sections}
        onSelectSection={handleSelectSectionFromRail}
        isScrolling={isScrolling}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 120, // Clear bottom capture bar
  },
  sectionHeader: {
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
  },
  monthHeaderText: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 24,
  },
  filteredEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screen,
    paddingBottom: 80,
  },
});
