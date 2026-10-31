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
import { Trash2, MapPin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing, fonts, motion } from '@/theme/tokens';
import { MomentPreview } from '@/types/moment';
import { CategoryLabel } from '@/components/moment/CategoryLabel';
import { VoicePill } from '@/components/moment/VoicePill';
import { ThumbnailRow } from '@/components/moment/ThumbnailRow';

interface JournalRowProps {
  moment: MomentPreview;
  isFirstOfDay: boolean;
  dayNumber: string;
  weekdayLabel: string;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Journal row component per DESIGN-home.md §3:
 * - Date gutter (44pt) on left, moment on right.
 * - Gutter filled only on first moment of each day.
 * - Content: meta line (time + glow dot + category), text (serif 17/26, 2 lines max), voice pill, thumbnails.
 * - 16pt vertical padding and a hairline between rows.
 */
export const JournalRow: React.FC<JournalRowProps> = React.memo(({
  moment,
  isFirstOfDay,
  dayNumber,
  weekdayLabel,
  onPress,
  onEdit,
  onDelete,
}) => {
  const { colors } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);

  const formattedTime = new Date(moment.createdAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  const fullDateLabel = new Date(moment.createdAt).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Compose accessibility label per DESIGN-home.md §8
  const accessibilityParts = [
    `${fullDateLabel}, ${formattedTime}`,
    moment.category?.name ? `Category: ${moment.category.name}` : null,
    moment.text ? moment.text : null,
    moment.voice ? `Voice note, ${Math.round(moment.voice.durationMs / 1000)} seconds` : null,
    moment.photoCount > 0 ? `${moment.photoCount} photo${moment.photoCount === 1 ? '' : 's'}` : null,
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
          <Trash2 size={20} color="#E05252" strokeWidth={1.8} />
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
        {/* Date gutter (44pt) */}
        <View style={styles.gutter}>
          {isFirstOfDay ? (
            <View style={styles.gutterContent}>
              <Text style={[styles.dayNumberText, { color: colors.text }]}>
                {dayNumber}
              </Text>
              <Text style={[typeTokens.small, { color: colors.muted }]} numberOfLines={1}>
                {weekdayLabel}
              </Text>
            </View>
          ) : (
            <View style={styles.gutterEmpty} />
          )}
        </View>

        {/* Content column */}
        <View style={styles.contentColumn}>
          {/* Meta line: time + category + optional location */}
          <View style={styles.metaRow}>
            <Text style={[typeTokens.meta, { color: colors.muted }]}>
              {formattedTime}
            </Text>

            {moment.category && (
              <View style={styles.categoryWrapper}>
                <CategoryLabel name={moment.category.name} />
              </View>
            )}

            {moment.locationName && (
              <View style={styles.locationMeta}>
                <MapPin size={11} color={colors.muted} strokeWidth={1.8} style={{ marginRight: 2 }} />
                <Text style={[typeTokens.meta, { color: colors.muted }]} numberOfLines={1}>
                  {moment.locationName}
                </Text>
              </View>
            )}
          </View>

          {/* Text in momentBody (serif 17/26, 2 lines max) */}
          {!!moment.text && (
            <Text
              style={[typeTokens.momentBody, { color: colors.text, marginTop: spacing.xs }]}
              numberOfLines={2}
            >
              {moment.text}
            </Text>
          )}

          {/* Voice pill */}
          {!!moment.voice && (
            <VoicePill durationMs={moment.voice.durationMs} />
          )}

          {/* Thumbnails row */}
          {moment.photos && moment.photos.length > 0 && (
            <ThumbnailRow photos={moment.photos} photoCount={moment.photoCount} />
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: spacing.lg, // 16pt vertical padding
    paddingRight: spacing.screen,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  gutter: {
    width: 44, // 44pt date gutter per DESIGN-home.md §3
    paddingLeft: spacing.screen,
    paddingRight: spacing.xs,
    alignItems: 'flex-start',
  },
  gutterContent: {
    alignItems: 'flex-start',
  },
  gutterEmpty: {
    width: 44,
  },
  dayNumberText: {
    fontFamily: fonts.serif,
    fontSize: 22,
    lineHeight: 24,
  },
  contentColumn: {
    flex: 1,
    paddingLeft: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryWrapper: {
    marginLeft: spacing.xs,
  },
  locationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  deleteActionContainer: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
