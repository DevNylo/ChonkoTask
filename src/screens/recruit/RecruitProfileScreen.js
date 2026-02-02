// Conteúdo genérico para Shop e Profile por enquanto
import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function PlaceholderScreen() {
  return (
    <LinearGradient colors={['#059669', '#34d399']} style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text style={{color: '#fff', fontSize: 24, fontWeight: 'bold'}}>Em breve!</Text>
    </LinearGradient>
  );
}