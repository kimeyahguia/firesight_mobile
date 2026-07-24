import React from 'react';
import { Drawer } from 'expo-router/drawer';
import CustomDrawerContent from '@/components/bfp/CustomDrawerContent';

export default function BfpDrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        overlayColor: 'rgba(17,24,39,0.55)',
        drawerStyle: { width: 300 },
        swipeEdgeWidth: 60,
      }}
    >
      <Drawer.Screen name="(bfp_tabs)" options={{ drawerLabel: 'Home' }} />
      <Drawer.Screen name="bfp_profile" options={{ drawerLabel: 'My Profile' }} />
      <Drawer.Screen name="bfp_settings" options={{ drawerLabel: 'Settings' }} />
    </Drawer>
  );
}