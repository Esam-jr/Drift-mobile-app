import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { HomeLayout } from '@/types/moment';

const KEY_HOME_LAYOUT = 'drift_home_layout';

/**
 * Retrieves the persisted Home layout preference per DESIGN-home.md §1:
 * "The choice is saved locally and Home opens in it next time."
 */
export async function getSavedHomeLayout(): Promise<HomeLayout> {
  try {
    if (Platform.OS === 'web') {
      const val = typeof window !== 'undefined' ? window.localStorage.getItem(KEY_HOME_LAYOUT) : null;
      if (val === 'journal' || val === 'gallery' || val === 'compact') return val;
      return 'journal';
    }
    const val = await SecureStore.getItemAsync(KEY_HOME_LAYOUT);
    if (val === 'journal' || val === 'gallery' || val === 'compact') return val;
    return 'journal';
  } catch (err) {
    console.warn('Could not read saved home layout:', err);
    return 'journal';
  }
}

/**
 * Persists the chosen Home layout preference.
 */
export async function saveHomeLayout(layout: HomeLayout): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(KEY_HOME_LAYOUT, layout);
      }
      return;
    }
    await SecureStore.setItemAsync(KEY_HOME_LAYOUT, layout);
  } catch (err) {
    console.warn('Could not save home layout:', err);
  }
}
