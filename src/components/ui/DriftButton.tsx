import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeContext';
import { DriftTokens } from '@/theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface DriftButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const DriftButton: React.FC<DriftButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const { theme } = useTheme();

  const handlePress = () => {
    if (disabled || loading) return;
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    onPress();
  };

  const getContainerStyle = (): ViewStyle => {
    let base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: DriftTokens.radius.md,
    };

    // Sizes
    if (size === 'sm') {
      base.paddingVertical = 8;
      base.paddingHorizontal = 14;
      base.borderRadius = DriftTokens.radius.sm;
    } else if (size === 'md') {
      base.paddingVertical = 12;
      base.paddingHorizontal = 20;
    } else if (size === 'lg') {
      base.paddingVertical = 16;
      base.paddingHorizontal = 26;
      base.borderRadius = DriftTokens.radius.lg;
    }

    // Variants
    if (variant === 'primary') {
      base.backgroundColor = theme.textPrimary;
    } else if (variant === 'secondary') {
      base.backgroundColor = theme.surfaceElevated;
      base.borderWidth = 1;
      base.borderColor = theme.border;
    } else if (variant === 'ghost') {
      base.backgroundColor = 'transparent';
    } else if (variant === 'danger') {
      base.backgroundColor = theme.roseSubtle;
      base.borderWidth = 1;
      base.borderColor = theme.rose;
    }

    if (disabled) {
      base.opacity = 0.45;
    }

    return base;
  };

  const getLabelColor = (): string => {
    if (variant === 'primary') {
      return theme.background;
    }
    if (variant === 'danger') {
      return theme.rose;
    }
    if (variant === 'ghost') {
      return theme.textSecondary;
    }
    return theme.textPrimary;
  };

  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 14;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[getContainerStyle(), style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getLabelColor()} />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text
            style={[
              {
                color: getLabelColor(),
                fontSize,
                fontWeight: '500',
                letterSpacing: -0.2,
              },
              textStyle,
            ]}
          >
            {label}
          </Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
