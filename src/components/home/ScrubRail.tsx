import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing, radius } from '@/theme/tokens';
import { Section } from '@/types/moment';

interface ScrubRailProps {
  sections: Section[];
  onSelectSection: (index: number) => void;
  isScrolling: boolean;
}

/**
 * ScrubRail component per DESIGN-home.md §2:
 * "A thin vertical rail on the right edge, visible while scrolling and for about 1.5 seconds after.
 * Dragging it shows a bubble with the month ("Oct") and jumps through the list.
 * Light selection haptic when crossing a month boundary. Visual width 2pt, touch area 44pt."
 */
export const ScrubRail: React.FC<ScrubRailProps> = ({
  sections,
  onSelectSection,
  isScrolling,
}) => {
  const { colors } = useTheme();
  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  const [bubbleY, setBubbleY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const opacityAnim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIndex = useRef<number>(-1);
  const railHeight = useRef<number>(0);

  // Show rail while scrolling and for ~1.5s after per DESIGN-home.md §2
  useEffect(() => {
    if (isScrolling || isDragging) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    } else {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start();
      }, 1500);
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [isScrolling, isDragging, opacityAnim]);

  const handleTouch = (y: number) => {
    if (sections.length === 0 || railHeight.current <= 0) return;

    // Clamp ratio between 0 and 1
    const clampedY = Math.max(0, Math.min(y, railHeight.current));
    const ratio = clampedY / railHeight.current;
    const index = Math.min(sections.length - 1, Math.max(0, Math.floor(ratio * sections.length)));

    setBubbleY(clampedY);

    const section = sections[index];
    if (section) {
      // 3-letter month abbreviation: e.g. "October 2026" -> "Oct"
      const monthAbbr = section.label.slice(0, 3);
      setActiveMonth(monthAbbr);
    }

    if (index !== lastIndex.current) {
      lastIndex.current = index;
      try {
        Haptics.selectionAsync();
      } catch (_) {}
      onSelectSection(index);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        setIsDragging(true);
        handleTouch(evt.nativeEvent.locationY);
      },
      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        handleTouch(evt.nativeEvent.locationY);
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
        setActiveMonth(null);
        lastIndex.current = -1;
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
        setActiveMonth(null);
        lastIndex.current = -1;
      },
    })
  ).current;

  if (sections.length <= 1) return null;

  return (
    <Animated.View
      style={[styles.container, { opacity: opacityAnim }]}
      pointerEvents="box-none"
    >
      {/* 44pt touchable area */}
      <View
        style={styles.touchArea}
        onLayout={(e) => {
          railHeight.current = e.nativeEvent.layout.height;
        }}
        {...panResponder.panHandlers}
        accessibilityLabel="Jump to month"
        accessibilityRole="adjustable"
      >
        {/* 2pt visual rail */}
        <View style={[styles.visualRail, { backgroundColor: colors.hairline }]}>
          <View
            style={[
              styles.activeIndicator,
              {
                backgroundColor: colors.muted,
                top: Math.max(0, Math.min(bubbleY - 8, railHeight.current - 16)),
              },
            ]}
          />
        </View>

        {/* Month bubble shown while dragging */}
        {isDragging && activeMonth && (
          <View
            style={[
              styles.bubble,
              {
                backgroundColor: colors.surface,
                borderColor: colors.hairline,
                top: Math.max(10, Math.min(bubbleY - 18, railHeight.current - 40)),
              },
            ]}
          >
            <Text style={[typeTokens.uiMedium, { color: colors.text }]}>
              {activeMonth}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    top: 70, // below header chips
    bottom: 90, // above capture bar
    width: 44,
    zIndex: 10,
  },
  touchArea: {
    flex: 1,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualRail: {
    width: 2,
    height: '80%',
    borderRadius: 1,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    left: -1,
    width: 4,
    height: 16,
    borderRadius: 2,
  },
  bubble: {
    position: 'absolute',
    right: 32,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
});
