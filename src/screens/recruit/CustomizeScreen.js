import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../styles/theme';

export default function CustomizeScreen() {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <MaterialCommunityIcons name="palette-outline" size={80} color="#8B5CF6" />
                <Text style={styles.title}>Visual do Chonko</Text>
                <Text style={styles.subtitle}>
                    Em breve você poderá trocar as roupas e acessórios do seu personagem 3D!
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center' },
    content: { alignItems: 'center', padding: 20 },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: '#4C1D95', marginTop: 20 },
    subtitle: { fontSize: 16, color: '#7C3AED', textAlign: 'center', marginTop: 10 }
});