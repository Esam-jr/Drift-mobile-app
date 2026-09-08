import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Wind } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { DriftTokens } from '@/theme/tokens';
import { DriftText } from './DriftText';
import { DriftButton } from './DriftButton';

interface EmptyStateProps {
  onCapturePress: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCapturePress }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconRing,
          {
            backgroundColor: theme.surface,
            borderColor: theme.borderSubtle,
          },
        ]}
      >
        <Wind size={32} color={theme.accent} strokeWidth={1.5} />
      </View>

      <DriftText variant="title" color="primary" center style={styles.heading}>
        Nothing captured yet.
      </DriftText>

      <DriftText variant="bodySmall" color="secondary" center style={styles.subheading}>
        Thoughts drift in and out of our minds. Capture whatever is with you right now.
      </DriftText>

      <DriftButton
        label="Capture a moment"
        onPress={onCapturePress}
        variant="primary"
        size="md"
        style={styles.button}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 64,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heading: {
    marginBottom: 8,
  },
  subheading: {
    maxWidth: 260,
    lineHeight: 22,
    marginBottom: 28,
  },
  button: {
    minWidth: 180,
  },
});
