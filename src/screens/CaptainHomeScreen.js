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
  const [captainName, setCaptainName] = useState(profile?.name || 'Comandante');
  const [pendingAttempts, setPendingAttempts] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [activeMissionsCount, setActiveMissionsCount] = useState(0);
  const [chonkoGems, setChonkoGems] = useState(0); 
  const [refreshing, setRefreshing] = useState(false);

  const DASHBOARD_ITEMS = [
    { 
        id: 'missions', 
        title: 'MISSÕES', 
        subtitle: 'Gerenciar Tarefas',
        icon: 'clipboard-list-outline', 
        color: '#4ADE80', 
        route: 'MissionManager' 
    },
    { 
        id: 'rewards', 
        title: 'LOJA DO REINO', 
        subtitle: 'Prêmios & Recompensas',
        icon: 'storefront-outline', 
        color: '#A78BFA', 
        route: 'RewardShop' 
    },
    { 
        id: 'season', 
        title: 'PASSE BATALHA', 
        subtitle: 'Temporada 1',
        icon: 'ticket-percent-outline', 
        color: '#FBBF24', 
        route: 'SeasonPass' 
    },
    { 
        id: 'tips', 
        title: 'DICAS & AJUDA', 
        subtitle: 'Como jogar',
        icon: 'school-outline', 
        color: '#60A5FA', 
        route: 'Tutorials' 
    },
    { 
        id: 'premium', 
        title: 'LOJA CHONKO', 
        subtitle: 'Comprar Chonko Gems',
        icon: 'diamond-stone', 
        color: '#F472B6', 
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

      const { data: recruits } = await supabase
        .from('profiles')
        .select('balance')
        .eq('family_id', profile.family_id)
        .eq('role', 'recruit');

      let sumCoins = 0;
      if (recruits) {
          recruits.forEach(r => {
              sumCoins += (r.balance || 0);
          });
      }
      setTotalCoins(sumCoins);

      const { data: captainData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single();
      
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
          Alert.alert("Em Breve", `A tela "${item.title}" está sendo construída!`);
      }
  };

  const handleDevSwitchProfile = async () => {
      try {
          if (navigation.canGoBack()) navigation.goBack(); 
          else navigation.navigate('RoleSelection'); 
      } catch (e) {
          Alert.alert("Aviso", "Deslogando para trocar de conta...");
          await supabase.auth.signOut();
      }
  };

  const renderListHeader = () => (
      <View style={styles.listHeaderWrapper}>
          <View style={styles.topGreenArea} />

          <View style={styles.headerContent}>
              <View style={styles.headerContainer}>
                  <View>
                      <Text style={styles.qgText}>QG DO COMANDO</Text>
                      <Text style={styles.familyText} numberOfLines={1}>{familyName}</Text>
                  </View>

                  <View style={styles.headerRight}>
                      <TouchableOpacity onPress={handleDevSwitchProfile} style={styles.avatarBtn} activeOpacity={0.8}>
                          <MaterialCommunityIcons name="face-man-profile" size={32} color="#fff" />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                          style={styles.bellBtn} 
                          onPress={() => pendingAttempts > 0 ? navigation.navigate('TaskApprovals', { familyId: profile.family_id }) : Alert.alert("Tudo limpo!", "Nenhuma notificação.")}
                      >
                          <MaterialCommunityIcons name="bell" size={28} color="#fff" />
                          {pendingAttempts > 0 && (
                              <View style={styles.notificationBadge}>
                                  <Text style={styles.badgeText}>{pendingAttempts}</Text>
                              </View>
                          )}
                      </TouchableOpacity>
                  </View>
              </View>

              <TouchableOpacity 
                  style={styles.statsBanner} 
                  activeOpacity={0.9} 
                  onPress={() => pendingAttempts > 0 && navigation.navigate('TaskApprovals', { familyId: profile.family_id })}
              >
                  <View style={styles.statColumn}>
                      <Text style={styles.statLabel}>Chonko Gems</Text>
                      <View style={styles.statValueRow}>
                          <MaterialCommunityIcons name="diamond-stone" size={18} color="#EC4899" />
                          <Text style={styles.statValue}>{chonkoGems}</Text>
                      </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.statColumn}>
                      <Text style={styles.statLabel}>Ativas</Text>
                      <View style={styles.statValueRow}>
                          <MaterialCommunityIcons name="format-list-checks" size={20} color="#3B82F6" />
                          <Text style={styles.statValue}>{activeMissionsCount}</Text>
                      </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.statColumn}>
                      <Text style={styles.statLabel}>Pendências</Text>
                      <View style={styles.statValueRow}>
                          <MaterialCommunityIcons name={pendingAttempts > 0 ? "bell-ring" : "bell-outline"} size={18} color={pendingAttempts > 0 ? "#EF4444" : "#94A3B8"} />
                          <Text style={[styles.statValue, pendingAttempts > 0 && { color: '#EF4444' }]}>
                              {pendingAttempts}
                          </Text>
                      </View>
                  </View>
              </TouchableOpacity>
          </View>
      </View>
  );

  const renderDashboardCard = ({ item }) => (
    <TouchableOpacity 
        style={[styles.dashCardWrapper, { backgroundColor: item.color }]} 
        activeOpacity={0.85} 
        onPress={() => handleCardPress(item)}
    >
        <MaterialCommunityIcons name={item.icon} size={42} color="#1E293B" style={{ opacity: 0.8, marginBottom: 8 }} />
        <Text style={styles.dashTitle}>{item.title}</Text>
        <Text style={styles.dashSubtitle}>{item.subtitle}</Text>
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
          columnWrapperStyle={{ paddingHorizontal: 20, justifyContent: 'space-between' }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
          refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboardData(); }} tintColor={COLORS.white}/>
          }
      />

      <View style={styles.bottomDockContainer}>
        <View style={styles.dockBackground}>
            <TouchableOpacity style={styles.dockItem}>
                <MaterialCommunityIcons name="home" size={28} color="#10B981" />
                <Text style={[styles.dockLabel, {color: '#10B981'}]}>Início</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.dockItem} onPress={() => navigation.navigate('FamilySettings', { familyId: profile.family_id, currentProfileId: profile.id })}>
                <MaterialCommunityIcons name="account-group-outline" size={28} color="#64748B" />
                <Text style={styles.dockLabel}>Tropa</Text>
            </TouchableOpacity>

            <View style={{ width: 60 }} />

            <TouchableOpacity style={styles.dockItem}>
                <MaterialCommunityIcons name="chart-bar" size={28} color="#64748B" />
                <Text style={styles.dockLabel}>Relatórios</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dockItem}>
                <MaterialCommunityIcons name="cog-outline" size={28} color="#64748B" />
                <Text style={styles.dockLabel}>Ajustes</Text>
            </TouchableOpacity>
        </View>

        <TouchableOpacity 
            style={styles.centerDockButton} 
            activeOpacity={0.9} 
            onPress={() => navigation.navigate('QuickMissions', { familyId: profile.family_id })}
        >
            <View style={styles.centerBtnInner}>
                <MaterialCommunityIcons name="lightning-bolt" size={36} color="#fff" />
            </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' }, 
  
  listHeaderWrapper: {
      position: 'relative',
      marginBottom: 20, 
  },
  headerContent: {
      paddingHorizontal: 20,
      paddingTop: 60, 
  },
  
  topGreenArea: {
      position: 'absolute',
      top: -1000, 
      left: 0,
      right: 0,
      bottom: 40, 
      backgroundColor: '#10B981', 
      borderBottomLeftRadius: 35,
      borderBottomRightRadius: 35,
  },
  
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 35 },
  qgText: { fontFamily: FONTS.bold, fontSize: 14, color: '#D1FAE5', letterSpacing: 1 },
  familyText: { fontFamily: FONTS.bold, fontSize: 28, color: '#FFFFFF', width: width * 0.60 },
  
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  bellBtn: { position: 'relative', padding: 5 },
  notificationBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#EF4444', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#10B981' },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },

  statsBanner: {
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      borderRadius: 24, 
      paddingVertical: 18,
      paddingHorizontal: 12,
      shadowColor: "#092F47",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
  },
  statColumn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 11, color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 6 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { fontSize: 20, fontFamily: FONTS.bold, color: '#1E293B' },
  divider: { width: 1.5, backgroundColor: '#F1F5F9', marginVertical: 8, height: '70%', alignSelf: 'center' },

  dashCardWrapper: { 
      width: CARD_WIDTH, 
      height: 145, 
      borderRadius: 24, 
      padding: 15, 
      alignItems: 'center', 
      justifyContent: 'center',
      marginBottom: COLUMN_GAP + 5, 
      
      // Borda levemente suavizada
      borderWidth: 1.5,
      borderColor: 'rgba(0,0,0,0.08)', 
      
      // --- LEVE SOMBRA INFERIOR ---
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 }, // Deslocamento apenas para baixo
      shadowOpacity: 0.12, // Bem suave
      shadowRadius: 6,
      elevation: 5, // Android
  },
  dashTitle: { fontFamily: FONTS.bold, fontSize: 15, color: '#1E293B', textAlign: 'center', marginTop: 6 },
  dashSubtitle: { fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(30, 41, 59, 0.7)', textAlign: 'center', marginTop: 2 },

  bottomDockContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 80,
  },
  dockBackground: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    height: 70,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    shadowColor: "#092F47",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  dockItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  dockLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    marginTop: 2
  },
  
  centerDockButton: {
    position: 'absolute',
    bottom: 25,
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B', 
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 12,
  },
  centerBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F59E0B', 
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff'
  }
});