import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { FONTS } from '../../styles/theme';

export default function TrophiesScreen() {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <MaterialCommunityIcons name="medal-outline" size={80} color="#F59E0B" />
                <Text style={styles.title}>Sala de Troféus</Text>
                <Text style={styles.subtitle}>
                    Suas conquistas lendárias aparecerão aqui.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' },
    content: { alignItems: 'center', padding: 20 },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: '#B45309', marginTop: 20 },
    subtitle: { fontSize: 16, color: '#D97706', textAlign: 'center', marginTop: 10 }
});