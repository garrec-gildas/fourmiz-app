// components/MessageStatus.tsx - Statut d'un message (envoyé/lu)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { chatUtils } from '@/utils/chatUtils';

interface MessageStatusProps {
  isMyMessage: boolean;
  isRead: boolean;
  timestamp: string;
}

export const MessageStatus: React.FC<MessageStatusProps> = ({ 
  isMyMessage, 
  isRead, 
  timestamp 
}) => {
  if (!isMyMessage) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.time}>
        {chatUtils.formatMessageTime(timestamp)}
      </Text>
      <Ionicons 
        name={isRead ? "checkmark-done" : "checkmark"} 
        size={14} 
        color={isRead ? "#10b981" : "#6b7280"} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  time: {
    fontSize: 11,
    color: '#9ca3af',
  },
});
