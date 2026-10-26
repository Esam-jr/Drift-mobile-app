import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  isSecurityEnabled,
  isBiometricsEnabled,
  getLockTimeout,
  setLockTimeout,
  checkBiometricHardware,
  authenticateWithBiometrics,
  verifyPasscode,
  setupPasscode,
  disableSecurity,
  setBiometricsEnabled,
  LockTimeout,
} from './securityService';

interface SecurityContextValue {
  isLocked: boolean;
  isSecured: boolean;
  biometricsActive: boolean;
  biometricType: string;
  hasBiometrics: boolean;
  lockTimeout: LockTimeout;
  isSettingUpPasscode: boolean;
  unlockWithPin: (pin: string) => Promise<boolean>;
  triggerBiometrics: () => Promise<boolean>;
  lock: () => void;
  unlock: () => void;
  startPasscodeSetup: () => void;
  cancelPasscodeSetup: () => void;
  completePasscodeSetup: (pin: string, enableBiometrics: boolean) => Promise<void>;
  disablePasscode: () => Promise<void>;
  updateLockTimeout: (timeout: LockTimeout) => Promise<void>;
  updateBiometricsEnabled: (enabled: boolean) => Promise<void>;
  refreshSecurityStatus: () => Promise<void>;
}

const SecurityContext = createContext<SecurityContextValue | undefined>(undefined);

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isSecured, setIsSecured] = useState<boolean>(false);
  const [biometricsActive, setBiometricsActive] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<string>('Biometrics');
  const [hasBiometrics, setHasBiometrics] = useState<boolean>(false);
  const [lockTimeout, setLockTimeoutState] = useState<LockTimeout>('immediately');
  const [isSettingUpPasscode, setIsSettingUpPasscode] = useState<boolean>(false);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastActiveTimestamp = useRef<number>(Date.now());

  const refreshSecurityStatus = useCallback(async () => {
    try {
      const secured = await isSecurityEnabled();
      const bio = await isBiometricsEnabled();
      const timeout = await getLockTimeout();
      const hardware = await checkBiometricHardware();

      setIsSecured(secured);
      setBiometricsActive(bio);
      setLockTimeoutState(timeout);
      setBiometricType(hardware.biometricType);
      setHasBiometrics(hardware.hasHardware && hardware.isEnrolled);
    } catch (err) {
      console.warn('Error refreshing security status:', err);
    }
  }, []);

  useEffect(() => {
    refreshSecurityStatus().then(() => {
      isSecurityEnabled().then((secured) => {
        if (secured) {
          setIsLocked(true);
        }
      });
    });
  }, [refreshSecurityStatus]);

  // Auto-lock when returning from background based on lockTimeout
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        lastActiveTimestamp.current = Date.now();
      }

      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        const secured = await isSecurityEnabled();
        if (secured) {
          const timeout = await getLockTimeout();
          const elapsed = Date.now() - lastActiveTimestamp.current;

          if (timeout === 'immediately') {
            setIsLocked(true);
          } else if (timeout === '1min' && elapsed >= 60000) {
            setIsLocked(true);
          }
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const unlockWithPin = useCallback(async (pin: string): Promise<boolean> => {
    const valid = await verifyPasscode(pin);
    if (valid) {
      setIsLocked(false);
      return true;
    }
    return false;
  }, []);

  const triggerBiometrics = useCallback(async (): Promise<boolean> => {
    const success = await authenticateWithBiometrics();
    if (success) {
      setIsLocked(false);
      return true;
    }
    return false;
  }, []);

  const lock = useCallback(() => {
    if (isSecured) {
      setIsLocked(true);
    }
  }, [isSecured]);

  const unlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  const startPasscodeSetup = useCallback(() => {
    setIsSettingUpPasscode(true);
  }, []);

  const cancelPasscodeSetup = useCallback(() => {
    setIsSettingUpPasscode(false);
  }, []);

  const completePasscodeSetup = useCallback(
    async (pin: string, enableBio: boolean) => {
      await setupPasscode(pin, enableBio);
      await refreshSecurityStatus();
      setIsSettingUpPasscode(false);
    },
    [refreshSecurityStatus]
  );

  const disablePasscode = useCallback(async () => {
    await disableSecurity();
    await refreshSecurityStatus();
    setIsLocked(false);
  }, [refreshSecurityStatus]);

  const updateLockTimeout = useCallback(
    async (timeout: LockTimeout) => {
      await setLockTimeout(timeout);
      setLockTimeoutState(timeout);
    },
    []
  );

  const updateBiometricsEnabled = useCallback(
    async (enabled: boolean) => {
      await setBiometricsEnabled(enabled);
      setBiometricsActive(enabled);
    },
    []
  );

  return (
    <SecurityContext.Provider
      value={{
        isLocked,
        isSecured,
        biometricsActive,
        biometricType,
        hasBiometrics,
        lockTimeout,
        isSettingUpPasscode,
        unlockWithPin,
        triggerBiometrics,
        lock,
        unlock,
        startPasscodeSetup,
        cancelPasscodeSetup,
        completePasscodeSetup,
        disablePasscode,
        updateLockTimeout,
        updateBiometricsEnabled,
        refreshSecurityStatus,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};
