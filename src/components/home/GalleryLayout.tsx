import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing, fonts } from '@/theme/tokens';
import { Section, MomentPreview } from '@/types/moment';
import { GalleryTile } from './GalleryTile';
import { ScrubRail } from './ScrubRail';

interface GalleryLayoutProps {
  sections: Section[];
  onOpenMoment: (id: string) => void;
  onEditMoment: (id: string) => void;
  onDeleteMoment: (id: string) => void;
  hasActiveFilter?: boolean;
  anchorMomentId?: string | null;
  onVisibleMomentChange?: (id: string) => void;
}

interface MasonrySection {
  key: string;
  label: string;
  leftColumn: MomentPreview[];
  rightColumn: MomentPreview[];
}

/**
 * Gallery layout component per DESIGN-home.md §5:
 * - Two-column masonry, 8pt gap, 16pt side padding.
 * - Month labels as full-width section headers.
 * - Scrub rail mapping drag position to month index.
 */
export const GalleryLayout: React.FC<GalleryLayoutProps> = ({
  sections,
  onOpenMoment,
  onEditMoment,
  onDeleteMoment,
  hasActiveFilter,
  anchorMomentId,
  onVisibleMomentChange,
}) => {
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const sectionYPositions = useRef<Map<number, number>>(new Map());

  // Distribute items into left and right columns using height-balanced greedy placement
  const masonrySections: MasonrySection[] = useMemo(() => {
    return sections.map((sec) => {
      const leftCol: MomentPreview[] = [];
      const rightCol: MomentPreview[] = [];
      let leftHeight = 0;
      let rightHeight = 0;

      for (const m of sec.moments) {
        let estHeight = 110;
        if (m.photos && m.photos.length > 0) {
          estHeight = 190;
        } else if (m.text && m.text.trim().length > 0) {
          const lines = Math.min(6, Math.ceil(m.text.length / 26));
          estHeight = 70 + lines * 22;
        }

        if (leftHeight <= rightHeight) {
          leftCol.push(m);
          leftHeight += estHeight + 8;
        } else {
          rightCol.push(m);
          rightHeight += estHeight + 8;
        }
      }

      return {
        key: sec.key,
        label: sec.label,
        leftColumn: leftCol,
        rightColumn: rightCol,
      };
    });
  }, [sections]);

  const handleScrollBegin = () => setIsScrolling(true);
  const handleScrollEnd = () => setIsScrolling(false);

  // Restore scroll position by anchoring on anchorMomentId per DESIGN-home.md §2
  useEffect(() => {
    if (!anchorMomentId) return;
    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const exists = sections[sIdx].moments.some((m) => m.id === anchorMomentId);
      if (exists) {
        setTimeout(() => {
          const y = sectionYPositions.current.get(sIdx);
          if (y !== undefined) {
            scrollViewRef.current?.scrollTo({ y, animated: false });
          }
        }, 50);
        break;
      }
    }
  }, [anchorMomentId, sections]);

  const handleSelectSectionFromRail = useCallback((index: number) => {
    const y = sectionYPositions.current.get(index);
    if (y !== undefined) {
      scrollViewRef.current?.scrollTo({ y, animated: false });
    }
  }, []);

  const handleSectionLayout = (index: number, event: LayoutChangeEvent) => {
    sectionYPositions.current.set(index, event.nativeEvent.layout.y);
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
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScrollBeginDrag={handleScrollBegin}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollBegin={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
      >
        {masonrySections.map((sec, secIdx) => (
          <View
            key={sec.key}
            style={styles.sectionWrapper}
            onLayout={(e) => handleSectionLayout(secIdx, e)}
          >
            {/* Full-width month section header per DESIGN-home.md §5 */}
            <Text style={[styles.monthHeader, { color: colors.muted }]}>
              {sec.label}
            </Text>

            {/* Two-column masonry grid */}
            <View style={styles.masonryRow}>
              {/* Left column */}
              <View style={styles.column}>
                {sec.leftColumn.map((item) => (
                  <GalleryTile
                    key={item.id}
                    moment={item}
                    onPress={() => onOpenMoment(item.id)}
                    onEdit={() => onEditMoment(item.id)}
                    onDelete={() => onDeleteMoment(item.id)}
                  />
                ))}
              </View>

              {/* Right column */}
              <View style={styles.column}>
                {sec.rightColumn.map((item) => (
                  <GalleryTile
                    key={item.id}
                    moment={item}
                    onPress={() => onOpenMoment(item.id)}
                    onEdit={() => onEditMoment(item.id)}
                    onDelete={() => onDeleteMoment(item.id)}
                  />
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

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
  scrollContent: {
    paddingBottom: 120, // Clear capture bar
  },
  sectionWrapper: {
    marginBottom: spacing.lg,
  },
  monthHeader: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 24,
    paddingHorizontal: 16, // 16pt side padding per DESIGN-home.md §5
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  masonryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16, // 16pt side padding per DESIGN-home.md §5
    gap: 8, // 8pt gap per DESIGN-home.md §5
  },
  column: {
    flex: 1,
    gap: 8, // 8pt gap between vertical tiles
  },
  filteredEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screen,
    paddingBottom: 80,
  },
});
