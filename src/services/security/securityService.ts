import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const KEY_PASSCODE_HASH = 'drift_pin_hash';
const KEY_SECURITY_ENABLED = 'drift_security_active';
const KEY_BIOMETRICS_ENABLED = 'drift_bio_active';
const SALT = 'drift_private_journal_salt_2026';

// Fallback in-memory / local storage for web preview
const webStorage = new Map<string, string>();

async function getStorageItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : webStorage.get(key) || null;
  }
  return await SecureStore.getItemAsync(key);
}

async function setStorageItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    } else {
      webStorage.set(key, value);
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteStorageItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    } else {
      webStorage.delete(key);
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

async function hashPin(pin: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${SALT}_${pin}_drift`
  );
}

/**
 * Returns whether passcode protection is currently active.
 */
export async function isSecurityEnabled(): Promise<boolean> {
  const enabled = await getStorageItem(KEY_SECURITY_ENABLED);
  return enabled === 'true';
}

/**
 * Returns whether biometric unlock is enabled.
 */
export async function isBiometricsEnabled(): Promise<boolean> {
  const enabled = await getStorageItem(KEY_BIOMETRICS_ENABLED);
  return enabled === 'true';
}

/**
 * Checks biometric hardware capabilities on the device.
 */
export async function checkBiometricHardware(): Promise<{
  hasHardware: boolean;
  isEnrolled: boolean;
  biometricType: string;
}> {
  if (Platform.OS === 'web') {
    return { hasHardware: false, isEnrolled: false, biometricType: 'None' };
  }

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometricType = 'Biometrics';
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'Face ID';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = 'Fingerprint';
    }

    return { hasHardware, isEnrolled, biometricType };
  } catch (err) {
    return { hasHardware: false, isEnrolled: false, biometricType: 'None' };
  }
}

/**
 * Sets up a new passcode and enables security.
 */
export async function setupPasscode(pin: string, enableBiometrics: boolean = false): Promise<void> {
  const hashed = await hashPin(pin);
  await setStorageItem(KEY_PASSCODE_HASH, hashed);
  await setStorageItem(KEY_SECURITY_ENABLED, 'true');
  await setStorageItem(KEY_BIOMETRICS_ENABLED, enableBiometrics ? 'true' : 'false');
}

/**
 * Verifies if an entered PIN matches the stored hash.
 */
export async function verifyPasscode(pin: string): Promise<boolean> {
  const storedHash = await getStorageItem(KEY_PASSCODE_HASH);
  if (!storedHash) return false;

  const enteredHash = await hashPin(pin);
  return enteredHash === storedHash;
}

/**
 * Triggers device native biometric prompt (Face ID / Fingerprint).
 */
export async function authenticateWithBiometrics(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Drift',
      cancelLabel: 'Use PIN',
      fallbackLabel: 'Use PIN',
      disableDeviceFallback: true,
    });

    return result.success;
  } catch (err) {
    return false;
  }
}

/**
 * Disables passcode protection.
 */
export async function disableSecurity(): Promise<void> {
  await deleteStorageItem(KEY_PASSCODE_HASH);
  await setStorageItem(KEY_SECURITY_ENABLED, 'false');
  await setStorageItem(KEY_BIOMETRICS_ENABLED, 'false');
}

/**
 * Changes existing passcode after confirming old PIN.
 */
export async function changePasscode(oldPin: string, newPin: string): Promise<boolean> {
  const isValid = await verifyPasscode(oldPin);
  if (!isValid) return false;

  const newHashed = await hashPin(newPin);
  await setStorageItem(KEY_PASSCODE_HASH, newHashed);
  return true;
}

/**
 * Updates biometrics preference toggle.
 */
export async function setBiometricsEnabled(enabled: boolean): Promise<void> {
  await setStorageItem(KEY_BIOMETRICS_ENABLED, enabled ? 'true' : 'false');
}
