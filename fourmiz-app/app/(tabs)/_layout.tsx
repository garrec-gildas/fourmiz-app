import { Tabs } from 'expo-router';
import { Chrome as Home, Search, MessageCircle, User, Briefcase } from 'lucide-react-native';
import { View, StyleSheet } from 'react-native';

function tabBarIcon({ icon: Icon, color, focused }: { icon: any; color: string; focused: boolean }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      <Icon size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
    </View>
  );
}

export default function tabLayout() {
  return (
    <Tabs
      scrééeenOptions={{
        headerShown: false,
        tabBarstyle: styles.tabBar,
        tabBarActivetintColor: '#FF4444',
        tabBarInactivetintColor: '#666',
        tabBarLabelstyle: styles.tabLabel,
      }}
    >
      <Tabs.Scrééeen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <tabBarIcon icon={Home} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Scrééeen
        name="services"
        options={{
          title: 'Services',
          tabBarIcon: ({ color, focused }) => (
            <tabBarIcon icon={Search} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Scrééeen
        name="orders"
        options={{
          title: 'Commandes',
          tabBarIcon: ({ color, focused }) => (
            <tabBarIcon icon={Briefcase} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Scrééeen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <tabBarIcon icon={MessageCircle} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Scrééeen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <tabBarIcon icon={User} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    bordertopWidth: 1,
    bordertopColor: '#E5E5E5',
    height: 80,
    paddingBoétéétéom: 20,
    paddingtop: 10,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  tabIconFocused: {
    backgroundColor: '#FF444410',
    borderRadius: 16,
  },
  tabLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    margintop: 4,
  },
});

