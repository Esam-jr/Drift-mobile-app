import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActionSheetIOS,
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Trash2, Mic, Image as ImageIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing, fonts } from '@/theme/tokens';
import { MomentPreview } from '@/types/moment';

interface CompactRowProps {
  moment: MomentPreview;
  dayNumber: string;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Compact row component per DESIGN-home.md §4:
 * - Single-line rows, minimum 48pt tall, hairline separators.
 * - Left: day number in serif (17), in a 44pt gutter.
 * - Middle: the first line of text in serif 16/22, truncated with an ellipsis.
 * - Right: small muted icons (mic if voice note, photo icon with count if photos).
 * - Voice-only shows "Voice note" in muted; Photo-only shows "Photos" in muted.
 * - Category is not shown in Compact rows.
 */
export const CompactRow: React.FC<CompactRowProps> = React.memo(({
  moment,
  dayNumber,
  onPress,
  onEdit,
  onDelete,
}) => {
  const { colors } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);

  const hasText = !!moment.text && moment.text.trim().length > 0;
  const hasVoice = !!moment.voice;
  const hasPhotos = moment.photoCount > 0;

  // Middle content label per DESIGN-home.md §4
  let middleContent: React.ReactNode;
  if (hasText) {
    middleContent = (
      <Text
        style={[styles.serifText, { color: colors.text }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {moment.text}
      </Text>
    );
  } else if (hasVoice) {
    middleContent = (
      <Text style={[styles.mutedPlaceholder, { color: colors.muted }]} numberOfLines={1}>
        Voice note
      </Text>
    );
  } else if (hasPhotos) {
    middleContent = (
      <Text style={[styles.mutedPlaceholder, { color: colors.muted }]} numberOfLines={1}>
        Photos
      </Text>
    );
  } else {
    middleContent = (
      <Text style={[styles.mutedPlaceholder, { color: colors.muted }]} numberOfLines={1}>
        Moment
      </Text>
    );
  }

  const fullDateLabel = new Date(moment.createdAt).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const accessibilityParts = [
    `${fullDateLabel}`,
    moment.text ? moment.text : null,
    hasVoice ? `Voice note, ${Math.round((moment.voice?.durationMs || 0) / 1000)} seconds` : null,
    hasPhotos ? `${moment.photoCount} photo${moment.photoCount === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join('. ');

  const handlePromptDelete = () => {
    swipeableRef.current?.close();
    Alert.alert(
      'Delete this moment?',
      "This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch (_) {}
            onDelete();
          },
        },
      ]
    );
  };

  const handleLongPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Edit', 'Delete'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) onEdit();
          else if (index === 2) handlePromptDelete();
        }
      );
    } else {
      Alert.alert('Moment', undefined, [
        { text: 'Edit', onPress: onEdit },
        { text: 'Delete', style: 'destructive', onPress: handlePromptDelete },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-70, -20, 0],
      outputRange: [1, 0.8, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={handlePromptDelete}
        accessibilityLabel="Delete moment"
        style={styles.deleteActionContainer}
      >
        <Animated.View style={[styles.deleteButton, { transform: [{ scale }] }]}>
          <Trash2 size={18} color="#E05252" strokeWidth={1.8} />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      friction={2}
      rightThreshold={40}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        onLongPress={handleLongPress}
        delayLongPress={350}
        accessibilityLabel={accessibilityParts}
        accessibilityActions={[
          { name: 'activate', label: 'Open' },
          { name: 'edit', label: 'Edit' },
          { name: 'delete', label: 'Delete' },
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'activate') onPress();
          else if (event.nativeEvent.actionName === 'edit') onEdit();
          else if (event.nativeEvent.actionName === 'delete') handlePromptDelete();
        }}
        style={[styles.row, { borderBottomColor: colors.hairline }]}
      >
        {/* Left: day number in serif (17) in a 44pt gutter */}
        <View style={styles.gutter}>
          <Text style={[styles.dayText, { color: colors.text }]}>
            {dayNumber}
          </Text>
        </View>

        {/* Middle: first line of text or placeholder */}
        <View style={styles.middleColumn}>
          {middleContent}
        </View>

        {/* Right: small muted icons */}
        <View style={styles.rightIcons}>
          {hasVoice && (
            <Mic size={14} color={colors.muted} strokeWidth={1.8} />
          )}

          {hasPhotos && (
            <View style={styles.photoIndicator}>
              <ImageIcon size={14} color={colors.muted} strokeWidth={1.8} />
              {moment.photoCount > 1 && (
                <Text style={[typeTokens.small, { color: colors.muted, marginLeft: 2 }]}>
                  {moment.photoCount}
                </Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
});

const styles = StyleSheet.create({
  row: {
    minHeight: 48, // Minimum 48pt tall per DESIGN-home.md §4
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.screen,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  gutter: {
    width: 44, // 44pt gutter per DESIGN-home.md §4
    paddingLeft: spacing.screen,
    paddingRight: spacing.xs,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  dayText: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 22,
  },
  middleColumn: {
    flex: 1,
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
  },
  serifText: {
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 22,
  },
  mutedPlaceholder: {
    fontFamily: fonts.serifItalic,
    fontSize: 15,
    lineHeight: 20,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.xs,
  },
  photoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteActionContainer: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
