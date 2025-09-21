// components/ChatBadge.tsx - Badge pour afficher le nombre de messages non lus
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ChatBadgeProps {
  count: number;
  style?: any;
  maxCount?: number;
}

export const ChatBadge: React.FC<ChatBadgeProps> = ({ 
  count, 
  style, 
  maxCount = 99 
}) => {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.tostring();

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.Text}>
        {displayCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  Text: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
});

