import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Trash2, Edit3, Check, X, MapPin, Calendar, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeContext';
import { DriftTokens } from '@/theme/tokens';
import { Moment, Category } from '@/types/moment';
import { getMomentById, updateMoment, deleteMoment, getCategories } from '@/services/db/momentRepository';
import { DriftText } from '@/components/ui/DriftText';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { AudioPlayer } from '@/components/moment/AudioPlayer';

export default function MomentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();

  const [moment, setMoment] = useState<Moment | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editText, setEditText] = useState<string>('');
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadMoment = useCallback(async () => {
    if (!id) return;
    try {
      const [data, allCats] = await Promise.all([
        getMomentById(id),
        getCategories(),
      ]);
      setMoment(data);
      setCategories(allCats);
      if (data) {
        setEditText(data.text || '');
        setEditCategoryId(data.categoryId || null);
      }
    } catch (err) {
      console.warn('Error fetching moment:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMoment();
  }, [loadMoment]);

  const handleDelete = () => {
    Alert.alert(
      'Release moment?',
      'This moment and any attached recordings or photos will be permanently released.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Release',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch (_) {}
            await deleteMoment(id);
            router.back();
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    try {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}
      const updated = await updateMoment({
        id,
        text: editText.trim(),
        categoryId: editCategoryId,
      });
      setMoment(updated);
      setIsEditing(false);
    } catch (err) {
      console.warn('Failed to update moment:', err);
      Alert.alert('Error', 'Could not save updates.');
    }
  };

  const handleCancelEdit = () => {
    if (moment) {
      setEditText(moment.text || '');
      setEditCategoryId(moment.categoryId || null);
    }
    setIsEditing(false);
  };

  if (!moment && !loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.notFoundContainer}>
          <DriftText variant="headline" color="secondary">
            Moment not found.
          </DriftText>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <DriftText variant="bodySmall" color="accent">
              Return to timeline
            </DriftText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const createdDate = moment ? new Date(moment.createdAt) : new Date();
  const dateFormatted = createdDate.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timeFormatted = createdDate.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={[styles.iconButton, { backgroundColor: theme.surface }]}
          >
            <ArrowLeft size={18} color={theme.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerActions}>
            {isEditing ? (
              <>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleCancelEdit}
                  style={[styles.iconButton, { backgroundColor: theme.surface, marginRight: 8 }]}
                >
                  <X size={18} color={theme.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleSaveEdit}
                  style={[styles.iconButton, { backgroundColor: theme.accent }]}
                >
                  <Check size={18} color="#0B0D11" strokeWidth={2.5} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setIsEditing(true)}
                  style={[styles.iconButton, { backgroundColor: theme.surface, marginRight: 8 }]}
                >
                  <Edit3 size={17} color={theme.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleDelete}
                  style={[styles.iconButton, { backgroundColor: theme.surface }]}
                >
                  <Trash2 size={17} color={theme.rose} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Metadata Header */}
          <View style={styles.metaContainer}>
            <DriftText variant="caption" color="tertiary" style={styles.dateLabel}>
              {dateFormatted} • {timeFormatted}
            </DriftText>

            <View style={styles.categoryRow}>
              {isEditing ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.editCatScroll}>
                  {categories.map((cat) => {
                    const isSelected = editCategoryId === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        activeOpacity={0.7}
                        onPress={() => setEditCategoryId(isSelected ? null : cat.id)}
                        style={[
                          styles.editCatChip,
                          {
                            backgroundColor: isSelected ? `${cat.color}25` : theme.surfaceElevated,
                            borderColor: isSelected ? cat.color : theme.borderSubtle,
                          },
                        ]}
                      >
                        <DriftText
                          variant="caption"
                          style={{ color: isSelected ? cat.color : theme.textSecondary }}
                        >
                          {cat.name}
                        </DriftText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                moment?.category && <CategoryBadge category={moment.category} size="md" />
              )}
            </View>
          </View>

          {/* Main Text Content */}
          {isEditing ? (
            <TextInput
              multiline
              value={editText}
              onChangeText={setEditText}
              style={[
                styles.editTextInput,
                {
                  color: theme.textPrimary,
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
              textAlignVertical="top"
              placeholder="What was on your mind?"
              placeholderTextColor={theme.textTertiary}
            />
          ) : (
            moment?.text && (
              <DriftText variant="body" color="primary" style={styles.bodyText}>
                {moment.text}
              </DriftText>
            )
          )}

          {/* Voice Player */}
          {moment?.audioUri && (
            <View style={styles.mediaBlock}>
              <DriftText variant="caption" color="tertiary" style={styles.sectionLabel}>
                VOICE RECORDING
              </DriftText>
              <AudioPlayer uri={moment.audioUri} durationMs={moment.audioDuration} />
            </View>
          )}

          {/* Photo Gallery */}
          {moment?.images && moment.images.length > 0 && (
            <View style={styles.mediaBlock}>
              <DriftText variant="caption" color="tertiary" style={styles.sectionLabel}>
                PHOTOS ({moment.images.length})
              </DriftText>
              {moment.images.map((img) => (
                <Image
                  key={img.id}
                  source={{ uri: img.uri }}
                  style={styles.detailImage}
                  resizeMode="contain"
                />
              ))}
            </View>
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
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 60,
  },
  metaContainer: {
    marginVertical: 16,
  },
  dateLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
  },
  editCatScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  editCatChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: DriftTokens.radius.full,
    borderWidth: 1,
    marginRight: 8,
  },
  bodyText: {
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 24,
    letterSpacing: -0.1,
  },
  editTextInput: {
    fontSize: 18,
    lineHeight: 28,
    padding: 16,
    borderRadius: DriftTokens.radius.md,
    borderWidth: 1,
    minHeight: 160,
    marginBottom: 24,
  },
  mediaBlock: {
    marginBottom: 24,
  },
  sectionLabel: {
    marginBottom: 8,
    letterSpacing: 0.6,
  },
  detailImage: {
    width: '100%',
    height: 320,
    borderRadius: DriftTokens.radius.md,
    marginBottom: 12,
  },
});
