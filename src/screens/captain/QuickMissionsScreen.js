import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../styles/theme';

const WEEKDAYS = [
    { id: 0, label: 'DOM' }, { id: 1, label: 'SEG' }, { id: 2, label: 'TER' }, 
    { id: 3, label: 'QUA' }, { id: 4, label: 'QUI' }, { id: 5, label: 'SEX' }, { id: 6, label: 'SÁB' }
];

export default function QuickMissionsScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { familyId } = route.params;
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState([]);

    useEffect(() => { 
        fetchData(); 
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: profilesData } = await supabase.from('profiles').select('id, name').eq('family_id', familyId);
        setProfiles(profilesData || []);

        const { data } = await supabase.from('missions')
            .select('*').eq('family_id', familyId).eq('is_template', true)
            .order('created_at', { ascending: false });
        setTemplates(data || []);
        setLoading(false);
    };

    const handleSelect = (template) => {
        navigation.navigate('CreateMission', { familyId, templateData: template });
    };

    const handleDelete = (id) => {
        Alert.alert("Excluir Modelo", "Isso apagará este modelo para sempre.", [
            { text: "Cancelar" },
            { text: "Excluir", style: 'destructive', onPress: async () => {
                // Deleta de verdade, pois é template
                await supabase.from('missions').delete().eq('id', id);
                fetchData();
            }}
        ]);
    };

    const getDayLabels = (days) => {
        if (!days || days.length === 0) return "";
        return days.map(id => WEEKDAYS.find(d => d.id === id)?.label.substring(0,3)).join(", ");
    };

    const renderCard = ({ item }) => {
        const isCustom = item.reward_type === 'custom';
        const assigneeName = item.assigned_to 
            ? (profiles.find(p => p.id === item.assigned_to)?.name || 'Recruta') 
            : 'TODOS';

        return (
            <TouchableOpacity style={styles.cardWrapper} activeOpacity={0.9} onPress={() => handleSelect(item)}>
                <View style={styles.cardShadow} />
                <View style={styles.cardFront}>
                    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                        <View style={styles.iconBox}>
                            <MaterialCommunityIcons name={item.icon} size={28} color={COLORS.primary} />
                        </View>
                        <View style={{flex:1}}>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <View style={{flexDirection: 'row', marginTop: 4}}>
                                <View style={[styles.tagBase, { backgroundColor: isCustom ? '#fdf2f8' : '#fffbeb', borderColor: isCustom ? '#db2777' : COLORS.gold }]}>
                                    <MaterialCommunityIcons name={isCustom ? "gift" : "star"} size={10} color={isCustom ? '#db2777' : COLORS.gold} />
                                    <Text style={[styles.tagText, { color: isCustom ? '#db2777' : '#b45309' }]}>
                                        {isCustom ? item.custom_reward : item.reward}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        {/* Botão de Excluir */}
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                            <MaterialCommunityIcons name="trash-can-outline" size={24} color={COLORS.error} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.metaInfoContainer}>
                        <View style={[styles.metaTag, { backgroundColor: item.is_recurring ? '#fff7ed' : '#fee2e2', borderColor: item.is_recurring ? '#f97316' : '#ef4444' }]}>
                            <MaterialCommunityIcons name={item.is_recurring ? "calendar-sync" : "calendar-check"} size={12} color={item.is_recurring ? '#ea580c' : '#b91c1c'} />
                            <Text style={[styles.metaText, { color: item.is_recurring ? '#ea580c' : '#b91c1c' }]}>
                                {item.is_recurring ? "Diária" : "Única"}
                            </Text>
                        </View>

                        {(item.start_time || item.deadline) && (
                            <View style={[styles.metaTag, { backgroundColor: '#eff6ff', borderColor: '#3b82f6' }]}>
                                <MaterialCommunityIcons name="clock-outline" size={12} color="#2563eb" />
                                <Text style={[styles.metaText, { color: '#2563eb' }]}>
                                    {item.start_time ? item.start_time.substring(0,5) : "00:00"} - {item.deadline ? item.deadline.substring(0,5) : "00:00"}
                                </Text>
                            </View>
                        )}

                        <View style={[styles.metaTag, { backgroundColor: '#f0fdf4', borderColor: '#16a34a' }]}>
                            <MaterialCommunityIcons name={item.assigned_to ? "account" : "account-group"} size={12} color="#15803d" />
                            <Text style={[styles.metaText, { color: '#15803d' }]}>{assigneeName}</Text>
                        </View>
                    </View>

                    {item.is_recurring && item.recurrence_days && (
                        <Text style={styles.daysText}>
                            <MaterialCommunityIcons name="calendar-range" size={12} /> {getDayLabels(item.recurrence_days)}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>MISSÕES RÁPIDAS</Text>
                <View style={{width:28}}/>
            </View>

            <FlatList
                data={templates}
                keyExtractor={item => item.id}
                contentContainerStyle={{padding: 20}}
                ListEmptyComponent={<Text style={styles.empty}>Nenhum modelo salvo.</Text>}
                renderItem={renderCard}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50 },
    headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.surface },
    backBtn: { padding: 5, backgroundColor: COLORS.surface, borderRadius: 10 },
    
    // Rich Card
    cardWrapper: { marginBottom: 15, position: 'relative' },
    cardShadow: { position: 'absolute', top: 6, left: 6, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20 },
    cardFront: { backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 3, borderColor: COLORS.primary, padding: 15 },
    iconBox: { width: 45, height: 45, backgroundColor: COLORS.surfaceAlt, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 2, borderColor: COLORS.primary },
    cardTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.textPrimary },
    tagBase: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
    tagText: { fontFamily: FONTS.bold, fontSize: 10, marginLeft: 4 },
    divider: { height: 2, backgroundColor: COLORS.surfaceAlt, marginVertical: 10 },
    
    metaInfoContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    metaTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
    metaText: { fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
    daysText: { fontSize: 11, color: '#666', marginTop: 8, fontStyle: 'italic' },
    
    deleteBtn: { padding: 10 },
    empty: { textAlign: 'center', color: COLORS.surface, marginTop: 50, fontFamily: FONTS.bold, fontSize: 16 }
});