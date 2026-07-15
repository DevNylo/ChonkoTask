import React from 'react';
import { Image } from 'react-native';

export default function ChonkoCoinIcon({ width = 80, height = 80 }) {
  return (
    <Image
        source={require('../../../assets/icons/ChonkoCoins.png')}
        style={{ width: width, height: height }}
        resizeMode="contain"
    />
  );
}