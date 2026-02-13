import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS, FONTS } from '../styles/theme';

const { width } = Dimensions.get('window');
const COLUMN_GAP = 15;
const CARD_WIDTH = (width - 40 - COLUMN_GAP) / 2; 

export default function CaptainHomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { profile } = route.params || {}; 
  
  const [familyName, setFamilyName] = useState('Minha Tropa');
  const [pendingAttempts, setPendingAttempts] = useState(0);
  const [activeMissionsCount, setActiveMissionsCount] = useState(0);
  const [chonkoGems, setChonkoGems] = useState(0); 
  const [refreshing, setRefreshing] = useState(false);

  // CONFIGURAÇÃO DE CORES
  const DASHBOARD_ITEMS = [
    { 
        id: 'missions', 
        title: 'MISSÕES', 
        subtitle: 'Gerenciar Tarefas',
        icon: 'clipboard-list-outline', 
        bg: '#86EFAC',      // Verde Claro
        dark: '#14532D',    // Verde Escuro
        route: 'MissionManager' 
    },
    { 
        id: 'rewards', 
        title: 'LOJA', 
        subtitle: 'Recompensas',
        icon: 'storefront-outline', 
        bg: '#C4B5FD',      // Roxo Claro
        dark: '#4C1D95',    // Roxo Escuro
        route: 'RewardShop' 
    },
    { 
        id: 'season', 
        title: 'PASSE', 
        subtitle: 'Temporada 1',
        icon: 'ticket-percent-outline', 
        bg: '#FDE047',      // Amarelo
        dark: '#713F12',    // Marrom
        route: 'SeasonPass' 
    },
    { 
        id: 'tips', 
        title: 'DICAS', 
        subtitle: 'Tutoriais',
        icon: 'school-outline', 
        bg: '#93C5FD',      // Azul Claro
        dark: '#1E3A8A',    // Azul Escuro
        route: 'Tutorials' 
    },
    { 
        id: 'premium', 
        title: 'GEMS', 
        subtitle: 'Comprar',
        icon: 'diamond-stone', 
        bg: '#F9A8D4',      // Rosa
        dark: '#831843',    // Vinho
        route: 'PremiumStore' 
    },
  ];

  useFocusEffect(
    useCallback(() => {
      if (profile?.family_id) fetchDashboardData();
    }, [profile])
  );

  const fetchDashboardData = async () => {
    try {
      const { data: family } = await supabase.from('families').select('name').eq('id', profile.family_id).single();
      if (family) setFamilyName(family.name);

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
        .from('profiles').select('*').eq('id', profile.id).single();
      
      setChonkoGems(captainData?.chonko_gems || 0);

    } catch (error) {
      console.log(error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCardPress = (item) => {
      if (item.id === 'missions') {
          navigation.navigate('MissionManager', { familyId: profile.family_id });
      } else {
          Alert.alert("Em Breve", `A tela "${item.title}" está em manutenção.`);
      }
  };

  const handleDevSwitchProfile = async () => {
      try {
          if (navigation.canGoBack()) navigation.goBack(); 
          else navigation.navigate('RoleSelection'); 
      } catch (e) {
          await supabase.auth.signOut();
      }
  };

  const renderListHeader = () => (
      <View style={styles.listHeaderWrapper}>
          
          {/* TOPO VERDE ESCURO */}
          <View style={styles.topGreenArea}>
              <View style={styles.headerRow}>
                  <View style={styles.headerLeft}>
                      <Text style={styles.qgLabel}>PAINEL DO ADMIN</Text>
                      <Text style={styles.familyTitle} numberOfLines={1}>{familyName}</Text>
                  </View>
                  
                  <View style={styles.headerRight}>
                      <TouchableOpacity onPress={handleDevSwitchProfile} style={styles.iconBtn}>
                          <MaterialCommunityIcons name="face-man-profile" size={26} color="#FFF" />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                          style={styles.iconBtn} 
                          onPress={() => pendingAttempts > 0 ? navigation.navigate('TaskApprovals', { familyId: profile.family_id }) : Alert.alert("Tudo limpo!", "Sem pendências.")}
                      >
                          <MaterialCommunityIcons name="bell" size={26} color="#FFF" />
                          {pendingAttempts > 0 && (
                              <View style={styles.badge}>
                                  <Text style={styles.badgeText}>{pendingAttempts}</Text>
                              </View>
                          )}
                      </TouchableOpacity>
                  </View>
              </View>
          </View>

          {/* BANNER DE STATUS (Bordas Suaves) */}
          <View style={styles.statsBannerWrapper}>
              <View style={styles.statsBannerShadow} />
              <TouchableOpacity 
                  style={styles.statsBannerFront} 
                  activeOpacity={0.95} 
                  onPress={() => pendingAttempts > 0 && navigation.navigate('TaskApprovals', { familyId: profile.family_id })}
              >
                  <View style={styles.statItem}>
                      <Text style={styles.statLabel}>CHONKO GEMS</Text>
                      <View style={styles.statValueRow}>
                          <MaterialCommunityIcons name="diamond-stone" size={18} color="#EC4899" />
                          <Text style={styles.statValue}>{chonkoGems}</Text>
                      </View>
                  </View>

                  <View style={styles.statDivider} />

                  <View style={styles.statItem}>
                      <Text style={styles.statLabel}>ATIVAS</Text>
                      <View style={styles.statValueRow}>
                          <MaterialCommunityIcons name="format-list-checks" size={20} color="#3B82F6" />
                          <Text style={styles.statValue}>{activeMissionsCount}</Text>
                      </View>
                  </View>

                  <View style={styles.statDivider} />

                  <View style={styles.statItem}>
                      <Text style={[styles.statLabel, pendingAttempts > 0 && {color: COLORS.error}]}>PENDÊNCIAS</Text>
                      <View style={styles.statValueRow}>
                          <MaterialCommunityIcons name={pendingAttempts > 0 ? "bell-ring" : "bell-outline"} size={18} color={pendingAttempts > 0 ? COLORS.error : COLORS.primary} />
                          <Text style={[styles.statValue, pendingAttempts > 0 && {color: COLORS.error}]}>{pendingAttempts}</Text>
                      </View>
                  </View>
              </TouchableOpacity>
          </View>
      </View>
  );

  const renderDashboardCard = ({ item }) => (
    <TouchableOpacity 
        style={styles.cardWrapper} 
        activeOpacity={0.85} 
        onPress={() => handleCardPress(item)}
    >
        {/* Sombra colorida */}
        <View style={[styles.cardShadow, { backgroundColor: item.dark }]} />
        
        {/* Card Front: Borda Fina (1px) */}
        <View style={[styles.cardFront, { backgroundColor: item.bg, borderColor: item.dark }]}>
            <MaterialCommunityIcons name={item.icon} size={42} color={item.dark} style={{ opacity: 0.9, marginBottom: 5 }} />
            <Text style={[styles.cardTitle, { color: item.dark }]}>{item.title}</Text>
            <Text style={[styles.cardSubtitle, { color: item.dark }]}>{item.subtitle}</Text>
        </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <FlatList
          data={DASHBOARD_ITEMS}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderListHeader}
          renderItem={renderDashboardCard}
          numColumns={2}
          columnWrapperStyle={styles.listColumns}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboardData(); }} tintColor={COLORS.primary}/>
          }
      />

      {/* DOCK INFERIOR (Bordas Suaves) */}
      <View style={styles.dockContainer}>
        <View style={styles.dockBar}>
            <TouchableOpacity style={styles.dockBtn}>
                <MaterialCommunityIcons name="home" size={28} color={COLORS.secondary} />
                <Text style={[styles.dockLabel, {color: COLORS.secondary}]}>Início</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.dockBtn} onPress={() => navigation.navigate('FamilySettings', { familyId: profile.family_id, currentProfileId: profile.id })}>
                <MaterialCommunityIcons name="account-group-outline" size={28} color="#64748B" />
                <Text style={styles.dockLabel}>Equipe</Text>
            </TouchableOpacity>

            <View style={{ width: 60 }} /> 

            <TouchableOpacity style={styles.dockBtn}>
                <MaterialCommunityIcons name="chart-bar" size={28} color="#64748B" />
                <Text style={styles.dockLabel}>Relatórios</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dockBtn}>
                <MaterialCommunityIcons name="cog-outline" size={28} color="#64748B" />
                <Text style={styles.dockLabel}>Ajustes</Text>
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
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  
  // --- HEADER VERDE ESCURO ---
  topGreenArea: {
      backgroundColor: COLORS.primary, // #064E3B
      paddingTop: 60,
      paddingBottom: 50,
      borderBottomLeftRadius: 35,
      borderBottomRightRadius: 35,
      paddingHorizontal: 20,
      marginBottom: 10,
  },
  
  headerRow: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      width: '100%',
  },
  
  headerLeft: { flex: 1, justifyContent: 'center' },
  headerRight: { flexDirection: 'row', gap: 12, alignItems: 'center' },

  qgLabel: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.accent, letterSpacing: 1, marginBottom: 2 },
  familyTitle: { fontFamily: FONTS.bold, fontSize: 24, color: '#FFF' },
  
  // Ícones do topo: Borda fina e suave
  iconBtn: { 
      width: 44, height: 44, 
      borderRadius: 16, // Mais suave
      backgroundColor: 'rgba(255,255,255,0.15)', 
      justifyContent: 'center', alignItems: 'center', 
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' 
  },
  
  badge: { 
      position: 'absolute', top: -4, right: -4, 
      backgroundColor: COLORS.error, 
      width: 20, height: 20, borderRadius: 10, 
      justifyContent: 'center', alignItems: 'center', 
      borderWidth: 1.5, borderColor: COLORS.primary 
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  listContent: { paddingBottom: 130 },
  listHeaderWrapper: { marginBottom: 15 },

  // --- STATS BANNER SUAVE ---
  statsBannerWrapper: { paddingHorizontal: 20, marginTop: -35, marginBottom: 10, position: 'relative' },
  statsBannerShadow: { position: 'absolute', top: 6, left: 20, right: 20, height: '100%', backgroundColor: COLORS.shadow, borderRadius: 24, opacity: 0.2 }, // Opacidade reduzida
  statsBannerFront: { 
      flexDirection: 'row', backgroundColor: '#FFF', 
      borderRadius: 24, paddingVertical: 18, alignItems: 'center', 
      borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' // Borda bem sutil
  },
  
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.primary, opacity: 0.6, marginBottom: 4 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statValue: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.primary },
  statDivider: { width: 1, height: '60%', backgroundColor: COLORS.surfaceAlt }, // Divisor fino

  // --- DASHBOARD CARDS SUAVES ---
  listColumns: { justifyContent: 'space-between', paddingHorizontal: 20 },
  cardWrapper: { width: CARD_WIDTH, height: 150, marginBottom: 20, position: 'relative' },
  
  cardShadow: { 
      position: 'absolute', top: 6, left: 0, 
      width: '100%', height: '100%', 
      borderRadius: 24, opacity: 0.25 
  },
  
  cardFront: { 
      flex: 1, alignItems: 'center', justifyContent: 'center', 
      padding: 15, borderRadius: 24, 
      borderWidth: 1, // Borda Fina (1px)
  },
  
  cardTitle: { fontFamily: FONTS.bold, fontSize: 15, textAlign: 'center', marginTop: 8 },
  cardSubtitle: { fontFamily: FONTS.regular, fontSize: 11, textAlign: 'center', marginTop: 2, opacity: 0.8 },

  // --- DOCK INFERIOR SUAVE ---
  dockContainer: { position: 'absolute', bottom: 30, left: 20, right: 20, height: 80, justifyContent: 'flex-end' },
  
  dockBar: { 
      flexDirection: 'row', 
      backgroundColor: '#FFF', 
      height: 70, 
      borderRadius: 35, 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      paddingHorizontal: 15, 
      // Borda cinza suave e fina
      borderWidth: 1, 
      borderColor: 'rgba(0,0,0,0.1)', 
      shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10
  },
  
  dockBtn: { alignItems: 'center', justifyContent: 'center', width: 60 },
  dockLabel: { fontSize: 10, fontFamily: FONTS.bold, color: '#64748B', marginTop: 3 },
  
  centerDockBtn: { 
      position: 'absolute', bottom: 25, alignSelf: 'center', 
      width: 76, height: 76, borderRadius: 38, 
      backgroundColor: '#F0F9FF', 
      justifyContent: 'center', alignItems: 'center', 
      shadowColor: COLORS.gold, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10 
  },
  centerDockInner: { 
      width: 64, height: 64, borderRadius: 32, 
      backgroundColor: COLORS.gold, 
      justifyContent: 'center', alignItems: 'center', 
      borderWidth: 1.5, borderColor: '#ffffff' // Borda interna suave
  },
});