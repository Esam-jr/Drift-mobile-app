import React, { useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Text,
  Alert,
  Platform,
  ActionSheetIOS,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Trash2, MapPin } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing, radius } from '@/theme/tokens';
import { Moment } from '@/types/moment';
import { deleteMoment } from '@/services/db/momentRepository';
import { stripMarkdown } from '@/utils/markdown';

interface Props {
  moment: Moment;
  onDeleted?: (id: string) => void;
  highlightQuery?: string;
}

const WAVEFORM_HEIGHTS = [6, 11, 16, 9, 14, 18, 12, 7, 15, 10, 14, 8];

export function MomentRow({ moment, onDeleted, highlightQuery }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const swipeableRef = useRef<Swipeable>(null);
  const collapseAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    router.push({
      pathname: '/moment/[id]',
      params: { id: moment.id },
    });
  };

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

            // Collapse animation over ~240ms per DESIGN.md §7
            Animated.timing(collapseAnim, {
              toValue: 0,
              duration: 240,
              useNativeDriver: false,
            }).start(async () => {
              try {
                await deleteMoment(moment.id);
                if (onDeleted) {
                  onDeleted(moment.id);
                }
              } catch (err) {
                console.warn('Failed to delete moment:', err);
              }
            });
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
          if (index === 1) {
            router.push({ pathname: '/capture', params: { editId: moment.id } });
          } else if (index === 2) {
            handlePromptDelete();
          }
        }
      );
    } else {
      Alert.alert('Moment', undefined, [
        {
          text: 'Edit',
          onPress: () =>
            router.push({ pathname: '/capture', params: { editId: moment.id } }),
        },
        { text: 'Delete', style: 'destructive', onPress: handlePromptDelete },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const formattedTime = new Date(moment.createdAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  const hasText = !!moment.text && moment.text.trim().length > 0;
  const hasAudio = !!moment.audioUri;
  const hasImages = moment.images && moment.images.length > 0;

  const formatDuration = (ms: number | null | undefined) => {
    if (!ms) return '0:00';
    const total = Math.floor(ms / 1000);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Highlights search matches with a tinted accent background per DESIGN.md §6.7
  const renderHighlightedText = (content: string, query?: string) => {
    const plainText = stripMarkdown(content);
    if (!query || !query.trim()) {
      return (
        <Text
          numberOfLines={3}
          style={[typeTokens.momentBody, { color: colors.text, marginTop: spacing.xs }]}
        >
          {plainText}
        </Text>
      );
    }

    const trimmed = query.trim();
    const parts = plainText.split(new RegExp(`(${trimmed})`, 'gi'));

    return (
      <Text
        numberOfLines={3}
        style={[typeTokens.momentBody, { color: colors.text, marginTop: spacing.xs }]}
      >
        {parts.map((part, i) =>
          part.toLowerCase() === trimmed.toLowerCase() ? (
            <Text
              key={i}
              style={{
                backgroundColor: colors.accent + '35',
                color: colors.text,
                borderRadius: 2,
              }}
            >
              {part}
            </Text>
          ) : (
            part
          )
        )}
      </Text>
    );
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
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
    <Animated.View
      style={{
        opacity: collapseAnim,
        transform: [{ scaleY: collapseAnim }],
        overflow: 'hidden',
      }}
    >
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        friction={2}
        rightThreshold={40}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={350}
          style={styles.container}
        >
          {/* Metadata: time + glow dot + category + optional location */}
          <View style={styles.metaRow}>
            <Text style={[typeTokens.meta, { color: colors.muted }]}>
              {formattedTime}
            </Text>

            {moment.category && (
              <View style={styles.categoryMeta}>
                <View style={[styles.glowDot, { backgroundColor: colors.glow }]} />
                <Text style={[typeTokens.meta, { color: colors.muted }]}>
                  {moment.category.name}
                </Text>
              </View>
            )}

            {moment.locationName && (
              <View style={styles.locationMeta}>
                <MapPin size={11} color={colors.muted} strokeWidth={1.8} style={{ marginRight: 2 }} />
                <Text style={[typeTokens.meta, { color: colors.muted }]}>
                  {moment.locationName}
                </Text>
              </View>
            )}
          </View>

          {/* Text content — serif on page bg with search match highlighting */}
          {hasText && renderHighlightedText(moment.text!, highlightQuery)}

          {/* Voice pill */}
          {hasAudio && (
            <View style={[styles.voicePill, { backgroundColor: colors.surface }]}>
              <View style={[styles.playCircle, { backgroundColor: colors.accent }]}>
                <Play
                  size={10}
                  color={colors.onAccent}
                  fill={colors.onAccent}
                  style={{ marginLeft: 1 }}
                />
              </View>
              <View style={styles.waveformRow}>
                {WAVEFORM_HEIGHTS.map((h, i) => (
                  <View
                    key={i}
                    style={[styles.waveBar, { height: h, backgroundColor: colors.muted }]}
                  />
                ))}
              </View>
              <Text style={[typeTokens.meta, { color: colors.muted }]}>
                {formatDuration(moment.audioDuration)}
              </Text>
            </View>
          )}

          {/* Photo thumbnails */}
          {hasImages && (
            <View style={styles.photoRow}>
              {moment.images.slice(0, 3).map((img) => (
                <Image
                  key={img.id}
                  source={{ uri: img.uri }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              ))}
            </View>
          )}
        </TouchableOpacity>
      </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  locationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  glowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  voicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  playCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    gap: 2,
  },
  waveBar: {
    width: 2.5,
    borderRadius: 1.5,
  },
  photoRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
  },
  deleteActionContainer: {
    width: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
