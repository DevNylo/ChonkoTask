import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../lib/supabase';
import { FONTS } from '../styles/theme';

const { width } = Dimensions.get('window');

// Componente de Botão 3D Estilizado para o Menu Principal
const MenuButton = ({ title, subtitle, icon, color, shadowColor, onPress }) => (
    <TouchableOpacity style={styles.menuBtnWrapper} activeOpacity={0.9} onPress={onPress}>
        <View style={[styles.menuBtnShadow, { backgroundColor: shadowColor }]} />
        <View style={[styles.menuBtnFront, { backgroundColor: color }]}>
            <MaterialCommunityIcons name={icon} size={36} color="#FFF" style={{ marginBottom: 5 }} />
            <Text style={styles.menuBtnTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.menuBtnSubtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
    </TouchableOpacity>
);

export default function AdminHomeScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { profile } = route.params || {};

    const [family, setFamily] = useState(null);
    const [pendingAttempts, setPendingAttempts] = useState(0);
    const [activeMissionsCount, setActiveMissionsCount] = useState(0);
    const [chonkoGems, setChonkoGems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            if (profile?.family_id) fetchDashboardData();
        }, [profile])
    );

    useEffect(() => {
        if (!profile?.family_id) return;

        const channel = supabase.channel('admin_dashboard_attempts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_attempts' },
                () => {
                    fetchDashboardData();
                })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [profile?.family_id]);

    const fetchDashboardData = async () => {
        try {
            const { data: familyData } = await supabase
                .from('families')
                .select('*')
                .eq('id', profile.family_id)
                .single();
            if (familyData) setFamily(familyData);

            const { count: pendingCount } = await supabase
                .from('mission_attempts')
                .select('id, profiles!inner(family_id)', { count: 'exact', head: true })
                .eq('status', 'pending')
                .eq('profiles.family_id', profile.family_id);
            setPendingAttempts(pendingCount || 0);

            const { count: activeCount } = await supabase
                .from('missions')
                .select('id', { count: 'exact', head: true })
                .eq('family_id', profile.family_id)
                .eq('status', 'active');
            setActiveMissionsCount(activeCount || 0);

            const { data: captainData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', profile.id)
                .single();
            setChonkoGems(captainData?.chonko_gems || 0);

        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleCardPress = (routeItem, title) => {
        if (routeItem === 'MissionManager') {
            navigation.navigate('MissionManager', { familyId: profile.family_id });
        } else if (routeItem === 'RewardShop') {
            navigation.navigate('RewardShop', { familyId: profile.family_id, profile: profile });
        } else {
            Alert.alert("Em Breve", `A tela "${title}" está em desenvolvimento.`);
        }
    };

    // SOLUÇÃO DO BUG DO BOTÃO VOLTAR
    const handleDevSwitchProfile = async () => {
        try {
            // Em vez de goBack (que as vezes empilha as telas), o replace destroi o QG e abre a Role
            navigation.replace('RoleSelection');
        } catch (e) {
            await supabase.auth.signOut();
        }
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#F59E0B" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <View style={styles.topOrangeArea}>
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.qgLabel}>PAINEL DE ADMIN</Text>
                        <Text style={styles.familyTitle} numberOfLines={1}>
                            {family?.name || 'Seu Grupo'}
                        </Text>
                    </View>

                    <View style={styles.headerRight}>
                        <TouchableOpacity onPress={handleDevSwitchProfile} style={styles.iconBtn}>
                            <MaterialCommunityIcons name="face-man-profile" size={24} color="#FFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => navigation.navigate('FamilySettings', { familyId: profile.family_id, currentProfileId: profile.id })}
                        >
                            <MaterialCommunityIcons name="cog-outline" size={24} color="#FFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => {
                                if (pendingAttempts > 0) {
                                    navigation.navigate('TaskApprovals', { familyId: profile.family_id });
                                } else {
                                    Alert.alert("Tudo limpo!", "Não há tarefas precisando de aprovação.");
                                }
                            }}
                        >
                            <MaterialCommunityIcons name={pendingAttempts > 0 ? "bell-ring" : "bell"} size={24} color="#FFF" />
                            {pendingAttempts > 0 && (
                                <View style={styles.badgeTop}>
                                    <Text style={styles.badgeTextTop}>{pendingAttempts}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboardData(); }} tintColor="#F59E0B"/>
                }
            >
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <MaterialCommunityIcons name="cards-playing-diamond" size={24} color="#EC4899" />
                        <Text style={styles.statNumber}>{chonkoGems}</Text>
                        <Text style={styles.statLabel}>CHONKO GEMS</Text>
                    </View>
                    <View style={styles.statBox}>
                        <MaterialCommunityIcons name="format-list-checks" size={24} color="#3B82F6" />
                        <Text style={styles.statNumber}>{activeMissionsCount}</Text>
                        <Text style={styles.statLabel}>ATIVAS</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.statBox}
                        activeOpacity={0.8}
                        onPress={() => {
                            if (pendingAttempts > 0) {
                                navigation.navigate('TaskApprovals', { familyId: profile.family_id });
                            } else {
                                Alert.alert("Tudo limpo!", "Não há tarefas precisando de aprovação.");
                            }
                        }}
                    >
                        <MaterialCommunityIcons name="bell-ring" size={24} color={pendingAttempts > 0 ? "#EF4444" : "#F59E0B"} />
                        <Text style={[styles.statNumber, pendingAttempts > 0 && { color: '#EF4444' }]}>{pendingAttempts}</Text>
                        <Text style={[styles.statLabel, pendingAttempts > 0 && { color: '#EF4444' }]}>PENDÊNCIAS</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>CENTRAL DE COMANDO</Text>

                <View style={styles.menuGrid}>
                    <MenuButton
                        title="MISSÕES" subtitle="Gerenciar Tarefas"
                        icon="clipboard-list-outline"
                        color="#10B981" shadowColor="#059669"
                        onPress={() => handleCardPress('MissionManager', 'MISSÕES')}
                    />
                    <MenuButton
                        title="LOJA" subtitle="Recompensas"
                        icon="storefront-outline"
                        color="#8B5CF6" shadowColor="#6D28D9"
                        onPress={() => handleCardPress('RewardShop', 'LOJA')}
                    />
                    <MenuButton
                        title="PASSE" subtitle="Temporada 1"
                        icon="ticket-percent-outline"
                        color="#F59E0B" shadowColor="#D97706"
                        onPress={() => handleCardPress('SeasonPass', 'PASSE')}
                    />
                    <MenuButton
                        title="DICAS" subtitle="Tutoriais"
                        icon="school-outline"
                        color="#3B82F6" shadowColor="#1D4ED8"
                        onPress={() => handleCardPress('Tutorials', 'DICAS')}
                    />
                    <MenuButton
                        title="GEMS" subtitle="Comprar"
                        icon="cards-playing-diamond"
                        color="#EC4899" shadowColor="#BE185D"
                        onPress={() => handleCardPress('PremiumStore', 'GEMS')}
                    />
                </View>
            </ScrollView>

            <View style={styles.dockContainer}>
                <View style={styles.dockBar}>
                    <TouchableOpacity style={styles.dockBtn}>
                        <MaterialCommunityIcons name="home" size={28} color="#D97706" />
                        <Text style={[styles.dockLabel, {color: '#D97706'}]}>Início</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.dockBtn} onPress={() => navigation.navigate('FamilySettings', { familyId: profile.family_id, currentProfileId: profile.id })}>
                        <MaterialCommunityIcons name="account-group-outline" size={28} color="#64748B" />
                        <Text style={styles.dockLabel}>Equipe</Text>
                    </TouchableOpacity>

                    <View style={{ width: 60 }} />

                    <TouchableOpacity style={styles.dockBtn} onPress={() => navigation.navigate('Reports', { familyId: profile.family_id })}>
                        <MaterialCommunityIcons name="chart-bar" size={28} color="#64748B" />
                        <Text style={styles.dockLabel}>Relatórios</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.dockBtn} onPress={() => navigation.navigate('Ranking', { familyId: profile.family_id })}>
                        <MaterialCommunityIcons name="podium" size={28} color="#64748B" />
                        <Text style={styles.dockLabel}>Ranking</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.centerDockBtn}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('QuickMissions', { familyId: profile.family_id })}
                >
                    <View style={styles.centerDockInner}>
                        <MaterialCommunityIcons name="flash" size={32} color="#FFF" />
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FDFCF8' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    topOrangeArea: {
        paddingTop: 60,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        backgroundColor: '#F59E0B',
        borderColor: '#D97706',
        zIndex: 10,
        borderWidth: 2,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 10
    },
    headerLeft: { flex: 1, justifyContent: 'center' },
    headerRight: { flexDirection: 'row', gap: 10, alignItems: 'center' },

    qgLabel: { fontFamily: FONTS.bold, fontSize: 12, color: '#FEF3C7', letterSpacing: 1, marginBottom: 2 },
    familyTitle: { fontFamily: FONTS.bold, fontSize: 24, color: '#FFF', letterSpacing: 1 },

    iconBtn: {
        width: 44, height: 44,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
    },
    badgeTop: {
        position: 'absolute', top: -4, right: -4,
        backgroundColor: '#EF4444',
        width: 20, height: 20, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1.5, borderColor: '#F59E0B'
    },
    badgeTextTop: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

    listContent: { padding: 25, paddingBottom: 130 },

    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 30 },
    statBox: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 15,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E2E8F0',

    },
    statNumber: { fontFamily: FONTS.regular, fontSize: 18, color: '#1E293B', marginTop: 5 },
    statLabel: { fontFamily: FONTS.regular, fontSize: 10, color: '#64748B', textAlign: 'center', marginTop: 2 },

    sectionTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#94A3B8', letterSpacing: 1.5, marginBottom: 20 },

    menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    menuBtnWrapper: { width: (width - 65) / 2, height: 120, marginBottom: 20 },
    menuBtnShadow: { position: 'absolute', bottom: -5, width: '100%', height: '100%', borderRadius: 24 },
    menuBtnFront: {
        flex: 1,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    menuBtnTitle: { fontFamily: FONTS.bold, fontSize: 15, color: '#FFF', marginTop: 5, textAlign: 'center', letterSpacing: 1.2 },
    menuBtnSubtitle: { fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },

    dockContainer: { position: 'absolute', bottom: 30, left: 20, right: 20, height: 80, justifyContent: 'flex-end' },

    dockBar: {
        marginBottom:5,
        flexDirection: 'row',
        backgroundColor: '#FFF',
        height: 70,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        borderBottomWidth: 5
    },

    dockBtn: { alignItems: 'center', justifyContent: 'center', width: 60 },
    dockLabel: { fontSize: 10, fontFamily: FONTS.bold, color: '#64748B', marginTop: 3 },

    centerDockBtn: {
        position: 'absolute', bottom: 25, alignSelf: 'center',
        width: 76, height: 76, borderRadius: 38,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center', alignItems: 'center',
        elevation: 10
    },
    centerDockInner: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: '#F59E0B',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#FFF'
    },
});