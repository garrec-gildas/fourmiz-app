// components/TypingIndicator.tsx - Indicateur "en train d'écrire"
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface TypingIndicatorProps {
  visible: boolean;
  userName?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  visible, 
  userName = 'L\'utilisateur' 
}) => {
  const [dots] = useState([
    new Animated.Value(0.4),
    new Animated.Value(0.4),
    new Animated.Value(0.4),
  ]);

  useEffect(() => {
    if (visible) {
      const animations = dots.map((dot, index) => 
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot, {
              toValue: 1,
              duration: 600,
              delay: index * 200,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0.4,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        )
      );

      animations.forEach(anim => anim.start());

      return () => {
        animations.forEach(anim => anim.stop());
      };
    } else {
      dots.forEach(dot => dot.setValue(0.4));
    }
  }, [visible, dots]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{userName} écrit</Text>
        <View style={styles.dotsContainer}>
          {dots.map((dot, index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                { opacity: dot }
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 4,
    alignItems: 'flex-start',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 8,
  },
  text: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6b7280',
  },
});
