import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Text,
  ActionSheetIOS,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ChevronDown, MoreHorizontal, MapPin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing, radius, hitSlop } from '@/theme/tokens';
import { Moment } from '@/types/moment';
import { getMomentById, deleteMoment } from '@/services/db/momentRepository';
import { AudioPlayer } from '@/components/moment/AudioPlayer';
import { MarkdownText } from '@/components/moment/MarkdownText';
import { EnrichedText } from 'react-native-enriched-html';

export default function MomentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const [moment, setMoment] = useState<Moment | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getMomentById(id);
      setMoment(data);
    } catch (err) {
      console.warn('Error fetching moment:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Reload when returning from edit screen
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleDelete = () => {
    Alert.alert(
      'Delete this moment?',
      "This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch (_) {}
            await deleteMoment(id);
            router.back();
          },
        },
      ]
    );
  };

  const handleMore = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Edit', 'Delete'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) {
            router.push({ pathname: '/capture', params: { editId: id } });
          } else if (index === 2) {
            handleDelete();
          }
        }
      );
    } else {
      Alert.alert('Options', undefined, [
        {
          text: 'Edit',
          onPress: () =>
            router.push({ pathname: '/capture', params: { editId: id } }),
        },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  if (loading) {
    return <View style={[styles.root, { backgroundColor: colors.bg }]} />;
  }

  if (!moment) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: colors.bg }]}>
        <Text style={[typeTokens.ui, { color: colors.muted }]}>
          Moment not found.
        </Text>
      </View>
    );
  }

  const createdDate = new Date(moment.createdAt);

  // "September 4" — month + day
  const dateLabel = createdDate.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  });

  // "2026, 8:41 PM"
  const yearTimeLabel = `${createdDate.getFullYear()}, ${createdDate.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`;

  const hasText = !!moment.text && moment.text.trim().length > 0;
  const hasImages = moment.images && moment.images.length > 0;
  const photoWidth = width - spacing.screen * 2;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Grabber + header */}
      <View style={styles.topBar}>
        {/* Grabber pill */}
        <View style={styles.grabberRow}>
          <View style={[styles.grabber, { backgroundColor: colors.hairline }]} />
        </View>

        <View style={styles.headerRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            accessibilityLabel="Close"
            hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
            style={styles.iconBtn}
          >
            <ChevronDown size={22} color={colors.muted} strokeWidth={1.8} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleMore}
            accessibilityLabel="More options"
            hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
            style={styles.iconBtn}
          >
            <MoreHorizontal size={20} color={colors.muted} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Large serif date */}
        <Text style={[typeTokens.dateDisplay, styles.dateLabel, { color: colors.text, fontSize: 27, lineHeight: 34 }]}>
          {dateLabel}
        </Text>

        {/* Muted year + time */}
        <Text style={[typeTokens.meta, styles.yearTime, { color: colors.muted }]}>
          {yearTimeLabel}
        </Text>

        {/* Text content rendered with EnrichedText or MarkdownText per DESIGN-capture.md §4b */}
        {hasText && (
          /<[a-z][\s\S]*>/i.test(moment.text!) ? (
            <EnrichedText
              style={{
                ...typeTokens.momentDetail,
                ...styles.body,
                color: colors.text,
              }}
              htmlStyle={{
                h1: { fontSize: 24, bold: true },
                h2: { fontSize: 20, bold: true },
              }}
            >
              {moment.text!}
            </EnrichedText>
          ) : (
            <MarkdownText
              content={moment.text!}
              baseTypeStyle={typeTokens.momentDetail}
              style={styles.body}
            />
          )
        )}

        {/* Voice player per DESIGN.md §6.6 */}
        {moment.audioUri && (
          <View style={styles.voiceWrapper}>
            <AudioPlayer uri={moment.audioUri} durationMs={moment.audioDuration} />
          </View>
        )}

        {/* Photos — swipeable carousel with "1 of 3" label and page dots */}
        {hasImages && (
          <View style={styles.photosBlock}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(
                  e.nativeEvent.contentOffset.x / photoWidth
                );
                setPhotoIndex(index);
              }}
            >
              {moment.images.map((img) => (
                <Image
                  key={img.id}
                  source={{ uri: img.uri }}
                  style={[styles.photo, { width: photoWidth }]}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>

            {/* Counter label */}
            {moment.images.length > 1 && (
              <Text style={[typeTokens.meta, styles.photoCounter, { color: colors.muted }]}>
                {photoIndex + 1} of {moment.images.length}
              </Text>
            )}

            {/* Page dots */}
            {moment.images.length > 1 && (
              <View style={styles.pageDots}>
                {moment.images.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.pageDot,
                      {
                        backgroundColor:
                          i === photoIndex ? colors.text : colors.hairline,
                      },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Category & Location — glow dot + name, and location pin + place */}
        {(moment.category || moment.locationName) && (
          <View style={styles.footerMetaRow}>
            {moment.category && (
              <View style={styles.categoryRow}>
                <View style={[styles.glowDot, { backgroundColor: colors.glow }]} />
                <Text style={[typeTokens.meta, { color: colors.muted }]}>
                  {moment.category.name}
                </Text>
              </View>
            )}

            {moment.locationName && (
              <View style={styles.locationRow}>
                <MapPin size={12} color={colors.muted} strokeWidth={1.8} style={{ marginRight: 4 }} />
                <Text style={[typeTokens.meta, { color: colors.muted }]}>
                  {moment.locationName}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    paddingHorizontal: spacing.screen,
  },
  grabberRow: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.huge,
    paddingTop: spacing.md,
  },
  dateLabel: {
    marginBottom: spacing.xs,
  },
  yearTime: {
    marginBottom: spacing.xl,
  },
  body: {
    marginBottom: spacing.xl,
  },
  voiceWrapper: {
    marginBottom: spacing.xl,
  },
  photosBlock: {
    marginBottom: spacing.xl,
  },
  photo: {
    height: 260,
    borderRadius: radius.md,
  },
  photoCounter: {
    marginTop: spacing.sm,
    textAlign: 'right',
  },
  pageDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  pageDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  footerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  glowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
});
