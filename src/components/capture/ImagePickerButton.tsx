import React from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  Text,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { DriftTokens } from '@/theme/tokens';

interface ImagePickerButtonProps {
  imageUris: string[];
  onImagesSelected: (newUris: string[]) => void;
  onImageRemoved: (index: number) => void;
}

export const ImagePickerButton: React.FC<ImagePickerButtonProps> = ({
  imageUris,
  onImagesSelected,
  onImageRemoved,
}) => {
  const { theme } = useTheme();

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo Access',
          'Drift needs access to your photos to attach memories to moments.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.85,
        selectionLimit: 5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uris = result.assets.map((asset) => asset.uri);
        onImagesSelected(uris);
      }
    } catch (err) {
      console.warn('Error picking image:', err);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Access',
          'Drift needs camera access to capture photo moments.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onImagesSelected([result.assets[0].uri]);
      }
    } catch (err) {
      console.warn('Error taking photo:', err);
    }
  };

  return (
    <View style={styles.container}>
      {/* Attached Images Thumbnails */}
      {imageUris.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailList}
        >
          {imageUris.map((uri, idx) => (
            <View key={`${uri}_${idx}`} style={styles.thumbnailWrapper}>
              <Image source={{ uri }} style={styles.thumbnail} />
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onImageRemoved(idx)}
                style={[styles.removeBadge, { backgroundColor: theme.surfaceElevated }]}
              >
                <X size={12} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={handlePickImage}
          style={[
            styles.actionPill,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <ImageIcon size={15} color={theme.amber} />
          <Text style={[styles.pillText, { color: theme.textSecondary }]}>Add photos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={handleTakePhoto}
          style={[
            styles.actionPill,
            { backgroundColor: theme.surface, borderColor: theme.border, marginLeft: 8 },
          ]}
        >
          <Camera size={15} color={theme.sky} />
          <Text style={[styles.pillText, { color: theme.textSecondary }]}>Camera</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  thumbnailList: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  thumbnailWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: DriftTokens.radius.sm,
  },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: DriftTokens.radius.full,
    borderWidth: 1,
  },
  pillText: {
    marginLeft: 7,
    fontSize: 13,
    fontWeight: '500',
  },
});
