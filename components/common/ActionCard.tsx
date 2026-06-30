  import React from 'react';
  import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
  import { Ionicons } from '@expo/vector-icons';
  import { COLORS } from '@/constants/theme';
  import { QuickAction } from '@/constants/types';

  const { width: SCREEN_WIDTH } = Dimensions.get('window');

  interface ActionCardProps {
    action: QuickAction;
    onPress?: () => void;
  }

  export default function ActionCard({ action, onPress }: ActionCardProps) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[styles.card, action.emphasized && styles.cardEmphasized]}
      >
        <View style={[styles.iconWrap, action.emphasized && styles.iconWrapEmphasized]}>
          <Ionicons
            name={action.icon}
            size={22}
            color={action.emphasized ? '#FFFFFF' : COLORS.deepIndigo}
          />
        </View>
        <Text style={[styles.title, action.emphasized && styles.titleEmphasized]}>
          {action.title}
        </Text>
        <Text style={[styles.description, action.emphasized && styles.descriptionEmphasized]}>
          {action.description}
        </Text>
      </TouchableOpacity>
    );
  }

  const styles = StyleSheet.create({
    card: {
      width: (SCREEN_WIDTH - 40 - 12) / 2,
      backgroundColor: COLORS.card,
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    cardEmphasized: {
      backgroundColor: COLORS.primaryOrange,
      borderColor: COLORS.primaryOrange,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: COLORS.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    iconWrapEmphasized: {
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    title: {
      fontSize: 14.5,
      fontWeight: '700',
      color: COLORS.deepIndigo,
      marginBottom: 3,
    },
    titleEmphasized: {
      color: '#FFFFFF',
    },
    description: {
      fontSize: 12,
      color: COLORS.slateText,
      lineHeight: 16,
    },
    descriptionEmphasized: {
      color: 'rgba(255,255,255,0.85)',
    },
  });