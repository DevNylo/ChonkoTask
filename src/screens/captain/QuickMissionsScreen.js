import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View, StatusBar } from 'react-native';
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
                {/* Sombra Suave Atrás */}
                <View style={styles.cardShadow} />

                {/* Card Frontal com Borda Verde Escura 1px */}
                <View style={styles.cardFront}>
                    
                    {/* Header do Card */}
                    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                        <View style={styles.iconBox}>
                            <MaterialCommunityIcons name={item.icon} size={28} color={COLORS.primary} />
                        </View>
                        <View style={{flex:1}}>
                            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                            <View style={{flexDirection: 'row', marginTop: 4}}>
                                <View style={[styles.tagBase, { backgroundColor: isCustom ? '#FDF2F8' : '#FFFBEB', borderColor: isCustom ? '#DB2777' : '#F59E0B' }]}>
                                    <MaterialCommunityIcons name={isCustom ? "gift" : "circle-multiple"} size={10} color={isCustom ? '#DB2777' : '#B45309'} />
                                    <Text style={[styles.tagText, { color: isCustom ? '#DB2777' : '#B45309' }]}>
                                        {isCustom ? (item.custom_reward || "Prêmio") : `+${item.reward}`}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        
                        {/* Botão de Excluir */}
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                            <MaterialCommunityIcons name="trash-can-outline" size={22} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    {/* Informações detalhadas */}
                    <View style={styles.metaInfoContainer}>
                        <View style={[styles.metaTag, { backgroundColor: item.is_recurring ? '#FFF7ED' : '#FEF2F2', borderColor: item.is_recurring ? '#F97316' : '#EF4444' }]}>
                            <MaterialCommunityIcons name={item.is_recurring ? "calendar-sync" : "calendar-check"} size={12} color={item.is_recurring ? '#EA580C' : '#B91C1C'} />
                            <Text style={[styles.metaText, { color: item.is_recurring ? '#EA580C' : '#B91C1C' }]}>
                                {item.is_recurring ? "Diária" : "Única"}
                            </Text>
                        </View>

                        {(item.start_time || item.deadline) && (
                            <View style={[styles.metaTag, { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' }]}>
                                <MaterialCommunityIcons name="clock-outline" size={12} color="#2563EB" />
                                <Text style={[styles.metaText, { color: '#2563EB' }]}>
                                    {item.start_time ? item.start_time.substring(0,5) : "00:00"} - {item.deadline ? item.deadline.substring(0,5) : "00:00"}
                                </Text>
                            </View>
                        )}

                        <View style={[styles.metaTag, { backgroundColor: '#F0FDF4', borderColor: '#16A34A' }]}>
                            <MaterialCommunityIcons name={item.assigned_to ? "account" : "account-group"} size={12} color="#15803D" />
                            <Text style={[styles.metaText, { color: '#15803D' }]}>{assigneeName}</Text>
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
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            
            {/* HEADER VERDE ESCURO */}
            <View style={styles.topGreenArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>MISSÕES RÁPIDAS</Text>
                    <View style={{width: 40}} /> 
                </View>
            </View>

            <FlatList
                data={templates}
                keyExtractor={item => item.id}
                contentContainerStyle={{padding: 20, paddingBottom: 50}}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {loading ? <ActivityIndicator color={COLORS.primary} /> : (
                            <>
                                <MaterialCommunityIcons name="flash-off" size={50} color="#CBD5E1" />
                                <Text style={styles.emptyText}>Nenhum modelo salvo.</Text>
                                <Text style={styles.emptySub}>Salve uma missão como modelo ao criar!</Text>
                            </>
                        )}
                    </View>
                }
                renderItem={renderCard}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F9FF' },
    
    // --- HEADER VERDE ESCURO (COLORS.primary) ---
    topGreenArea: {
        backgroundColor: COLORS.primary, // #064E3B
        paddingTop: 50,
        paddingBottom: 20,
        borderBottomLeftRadius: 35, // Mais suave
        borderBottomRightRadius: 35, // Mais suave
        zIndex: 10,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
    headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#D1FAE5', letterSpacing: 1 },
    backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14 },
    
    // --- CARDS (Borda Verde Escura 1px) ---
    cardWrapper: { 
        marginBottom: 15, borderRadius: 24, position: 'relative'
    },
    cardShadow: {
        position: 'absolute', top: 6, left: 0, width: '100%', height: '100%',
        backgroundColor: COLORS.shadow, borderRadius: 24, opacity: 0.05
    },
    cardFront: { 
        backgroundColor: '#FFF', 
        borderRadius: 24, 
        borderWidth: 1, 
        borderColor: COLORS.primary, // <--- AQUI: Borda Verde Escuro
        padding: 16 
    },
    
    iconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    cardTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#1E293B' },
    
    tagBase: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
    tagText: { fontFamily: FONTS.bold, fontSize: 11, marginLeft: 4 },
    
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
    
    metaInfoContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    metaTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    metaText: { fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
    daysText: { fontSize: 11, color: '#64748B', marginTop: 10, marginLeft: 2 },
    
    deleteBtn: { padding: 8 },
    
    // --- EMPTY STATE ---
    emptyContainer: { alignItems: 'center', marginTop: 60, opacity: 0.8 },
    emptyText: { fontFamily: FONTS.bold, fontSize: 16, color: '#64748B', marginTop: 15 },
    emptySub: { fontFamily: FONTS.regular, fontSize: 14, color: '#94A3B8', marginTop: 5, textAlign: 'center', paddingHorizontal: 40 },
});