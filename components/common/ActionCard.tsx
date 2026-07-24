import { COLORS } from '@/constants/theme';
import { QuickAction } from '@/constants/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

interface ActionCardProps {
  action: QuickAction;
  onPress?: () => void;
}

export default function ActionCard({ action, onPress }: ActionCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const isPrimary = !!action.emphasized;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.card,
          isPrimary && styles.cardPrimary,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={[styles.iconWrap, isPrimary && styles.iconWrapPrimary]}>
          <Ionicons
            name={action.icon}
            size={23}
            color={COLORS.primaryOrange}
          />
        </View>

        <View style={styles.textBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {action.title}
            </Text>
            <Ionicons name="chevron-forward" size={13} color={COLORS.mutedText} />
          </View>
          <Text style={styles.description} numberOfLines={2}>
            {action.description}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  card: {
    width: '100%',
    minHeight: 100,
    borderRadius: 26,
    paddingVertical: 16,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0F1235',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardPrimary: {
    borderColor: 'rgba(249,115,22,0.28)',
    borderWidth: 1.5,
  },
  cardPressed: {
    backgroundColor: COLORS.surfaceMuted,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(249,115,22,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconWrapPrimary: {
    backgroundColor: 'rgba(249,115,22,0.18)',
  },
  textBlock: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  title: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  description: {
    fontSize: 11.5,
    color: COLORS.slateText,
    lineHeight: 15,
  },
});