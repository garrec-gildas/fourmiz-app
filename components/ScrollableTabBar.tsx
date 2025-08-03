// components/ScrollableTabBar.tsx - Alternative si Expo Tabs ne supporte pas le scroll
import React from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface TabItem {
  name: string;
  title: string;
  icon: string;
  href: string | null;
  isActive?: boolean;
}

interface ScrollableTabBarProps {
  tabs: TabItem[];
  activeTab?: string;
}

export const ScrollableTabBar: React.FC<ScrollableTabBarProps> = ({ 
  tabs, 
  activeTab 
}) => {
  const handleTabPress = (tab: TabItem) => {
    if (tab.href) {
      router.push(tab.href);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.name;
          
          return (
            <TouchableOpacity
              key={tab.name}
              style={[
                styles.tabItem,
                isActive && styles.activeTabItem
              ]}
              onPress={() => handleTabPress(tab)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon as any}
                size={24}
                color={isActive ? '#FF4444' : '#666'}
                style={styles.icon}
              />
              <Text 
                style={[
                  styles.label,
                  isActive && styles.activeLabel
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {tab.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    height: 90,
    paddingBottom: 20,
    paddingTop: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 8,
    minWidth: '100%', // S'assurer que le contenu occupe au moins toute la largeur
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
    maxWidth: 120,
  },
  activeTabItem: {
    // Optionnel: style pour l'onglet actif
  },
  icon: {
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  activeLabel: {
    color: '#FF4444',
  },
});

export default ScrollableTabBar;
