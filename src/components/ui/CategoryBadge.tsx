import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Sparkles, Heart, Camera, Briefcase, Compass, Tag } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { DriftTokens } from '@/theme/tokens';
import { Category } from '@/types/moment';

interface CategoryBadgeProps {
  category?: Category | null;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  size = 'sm',
  style,
}) => {
  const { theme } = useTheme();

  if (!category) return null;

  const color = category.color || theme.accent;
  const isSm = size === 'sm';

  const renderIcon = () => {
    const iconSize = isSm ? 10 : 12;
    switch (category.icon) {
      case 'sparkles':
        return <Sparkles size={iconSize} color={color} />;
      case 'heart':
        return <Heart size={iconSize} color={color} />;
      case 'camera':
        return <Camera size={iconSize} color={color} />;
      case 'briefcase':
        return <Briefcase size={iconSize} color={color} />;
      case 'compass':
        return <Compass size={iconSize} color={color} />;
      default:
        return <Tag size={iconSize} color={color} />;
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: `${color}1A`, // 10% opacity
          borderColor: `${color}33`, // 20% opacity
          paddingVertical: isSm ? 3 : 5,
          paddingHorizontal: isSm ? 8 : 12,
        },
        style,
      ]}
    >
      <View style={styles.iconContainer}>{renderIcon()}</View>
      <Text
        style={[
          styles.text,
          {
            color,
            fontSize: isSm ? 11 : 12,
          },
        ]}
      >
        {category.name}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: DriftTokens.radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: 5,
  },
  text: {
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
