import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  isSecurityEnabled,
  isBiometricsEnabled,
  authenticateWithBiometrics,
  verifyPasscode,
} from './securityService';

interface SecurityContextValue {
  isLocked: boolean;
  isSecured: boolean;
  biometricsActive: boolean;
  unlockWithPin: (pin: string) => Promise<boolean>;
  triggerBiometrics: () => Promise<boolean>;
  lock: () => void;
  refreshSecurityStatus: () => Promise<void>;
}

const SecurityContext = createContext<SecurityContextValue | undefined>(undefined);

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isSecured, setIsSecured] = useState<boolean>(false);
  const [biometricsActive, setBiometricsActive] = useState<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const refreshSecurityStatus = useCallback(async () => {
    const secured = await isSecurityEnabled();
    const bio = await isBiometricsEnabled();
    setIsSecured(secured);
    setBiometricsActive(bio);
  }, []);

  useEffect(() => {
    refreshSecurityStatus().then(() => {
      // Check if we should start locked on launch
      isSecurityEnabled().then((secured) => {
        if (secured) {
          setIsLocked(true);
        }
      });
    });
  }, [refreshSecurityStatus]);

  // Auto-lock when returning from background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        const secured = await isSecurityEnabled();
        if (secured) {
          setIsLocked(true);
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

  return (
    <SecurityContext.Provider
      value={{
        isLocked,
        isSecured,
        biometricsActive,
        unlockWithPin,
        triggerBiometrics,
        lock,
        refreshSecurityStatus,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = (): SecurityContextValue => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};
