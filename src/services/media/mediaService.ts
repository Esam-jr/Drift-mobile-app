import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const MEDIA_DIR = `${FileSystem.documentDirectory || ''}drift_media/`;

/**
 * Ensures that the local drift_media directory exists.
 */
export async function ensureMediaDirectoryExists(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const dirInfo = await FileSystem.getInfoAsync(MEDIA_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(MEDIA_DIR, { intermediates: true });
    }
  } catch (error) {
    console.warn('Could not initialize media directory:', error);
  }
}

/**
 * Persists a temporary media file (from picker or audio recorder) into permanent app storage.
 */
export async function persistMediaFile(sourceUri: string, type: 'image' | 'audio'): Promise<string> {
  if (Platform.OS === 'web') {
    return sourceUri; // On web, use the object URI directly
  }

  try {
    await ensureMediaDirectoryExists();
    const extension = type === 'image' ? 'jpg' : 'm4a';
    const filename = `drift_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`;
    const destinationUri = `${MEDIA_DIR}${filename}`;

    await FileSystem.copyAsync({
      from: sourceUri,
      to: destinationUri,
    });

    return destinationUri;
  } catch (error) {
    console.warn('Failed to persist media file, falling back to source URI:', error);
    return sourceUri;
  }
}

/**
 * Deletes a media file safely from disk if it exists in drift_media.
 */
export async function deleteMediaFile(fileUri: string): Promise<void> {
  if (Platform.OS === 'web' || !fileUri) return;

  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch (error) {
    console.warn('Failed to delete media file:', fileUri, error);
  }
}

/**
 * Calculates total disk usage for Drift media assets.
 */
export async function getMediaStorageStats(): Promise<{ audioBytes: number; imageBytes: number; totalBytes: number }> {
  if (Platform.OS === 'web') {
    return { audioBytes: 0, imageBytes: 0, totalBytes: 0 };
  }

  try {
    await ensureMediaDirectoryExists();
    const files = await FileSystem.readDirectoryAsync(MEDIA_DIR);
    let audioBytes = 0;
    let imageBytes = 0;

    for (const file of files) {
      const filePath = `${MEDIA_DIR}${file}`;
      const info = await FileSystem.getInfoAsync(filePath);
      if (info.exists && !info.isDirectory) {
        const size = info.size || 0;
        if (file.includes('_audio_')) {
          audioBytes += size;
        } else {
          imageBytes += size;
        }
      }
    }

    return {
      audioBytes,
      imageBytes,
      totalBytes: audioBytes + imageBytes,
    };
  } catch (error) {
    console.warn('Could not read media storage stats:', error);
    return { audioBytes: 0, imageBytes: 0, totalBytes: 0 };
  }
}
