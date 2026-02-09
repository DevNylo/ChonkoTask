import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// TEMA
import { COLORS, FONTS } from '../styles/theme';

const { width } = Dimensions.get('window');
const COLUMN_GAP = 15;
const CARD_WIDTH = (width - 40 - COLUMN_GAP) / 2; // 40 = padding horizontal total

export default function CaptainHomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { session } = useAuth();
  const { profile } = route.params || {}; 
  
  const [familyName, setFamilyName] = useState('Minha Tropa');
  const [pendingAttempts, setPendingAttempts] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // --- DADOS DO DASHBOARD ---
  const DASHBOARD_ITEMS = [
    { 
        id: 'missions', 
        title: 'MISSÕES', 
        subtitle: 'Gerenciar Tarefas',
        icon: 'clipboard-list-outline', 
        color: '#10B981', // Verde
        route: 'MissionManager' 
    },
    { 
        id: 'rewards', 
        title: 'LOJA DO REINO', 
        subtitle: 'Prêmios & Recompensas',
        icon: 'storefront-outline', 
        color: '#8B5CF6', // Roxo
        route: 'RewardShop' 
    },
    { 
        id: 'season', 
        title: 'PASSE DE BATALHA', 
        subtitle: 'Temporada 1',
        icon: 'ticket-percent-outline', // Ícone corrigido
        color: COLORS.gold, // Dourado
        route: 'SeasonPass' 
    },
    { 
        id: 'tips', 
        title: 'DICAS & AJUDA', 
        subtitle: 'Como jogar',
        icon: 'school-outline', 
        color: '#3B82F6', // Azul
        route: 'Tutorials' 
    },
    { 
        id: 'premium', 
        title: 'LOJA CHONKO', 
        subtitle: 'Comprar Kapycoins',
        icon: 'diamond-stone', 
        color: '#EC4899', // Rosa
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

      // Contagem de pendências (vital para o alerta)
      const { count } = await supabase
        .from('mission_attempts')
        .select('id, profiles!inner(family_id)', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('profiles.family_id', profile.family_id);

      setPendingAttempts(count || 0);

    } catch (error) {
      console.log(error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCardPress = (item) => {
      if (item.id === 'missions') {
          // Passamos familyId para o gerenciador saber o que carregar
          navigation.navigate('MissionManager', { familyId: profile.family_id });
      } 
      else {
          Alert.alert("Em Breve", `A tela "${item.title}" está sendo construída pelos goblins!`);
      }
  };

  // --- RENDERIZADORES ---

  const renderHeader = () => (
    <View style={styles.headerContainer}>
        <View>
            <Text style={styles.greetingText}>QG DO COMANDO</Text>
            <Text style={styles.familyText} numberOfLines={1}>{familyName}</Text>
        </View>
        
        {/* BOTÃO DE GESTÃO DA TROPA (NOVO) */}
        <TouchableOpacity 
            style={styles.inviteBtn} 
            onPress={() => navigation.navigate('FamilySettings', { 
                familyId: profile.family_id, 
                currentProfileId: profile.id 
            })}
        >
            <View style={styles.inviteBtnShadow} />
            <View style={styles.inviteBtnFront}>
                <MaterialCommunityIcons name="account-group" size={24} color={COLORS.primary} />
            </View>
        </TouchableOpacity>
    </View>
  );

  const renderAlertBanner = () => {
      if (pendingAttempts === 0) return null;
      return (
        <TouchableOpacity 
            style={styles.alertContainer}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('TaskApprovals', { familyId: profile.family_id })}
        >
            <View style={styles.alertShadow} />
            <View style={styles.alertFront}>
                <View style={styles.alertIconBox}>
                    <MaterialCommunityIcons name="bell-ring" size={24} color={COLORS.white} />
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.alertTitle}>ATENÇÃO, CAPITÃO!</Text>
                    <Text style={styles.alertDesc}>{pendingAttempts} missões aguardam aprovação.</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.error} />
            </View>
        </TouchableOpacity>
      );
  };

  const renderDashboardCard = ({ item }) => (
    <TouchableOpacity 
        style={styles.dashCardWrapper}
        activeOpacity={0.9}
        onPress={() => handleCardPress(item)}
    >
        <View style={styles.dashCardShadow} />
        <View style={[styles.dashCardFront, { borderColor: item.color }]}>
            <View style={[styles.dashIconCircle, { backgroundColor: item.color }]}>
                <MaterialCommunityIcons name={item.icon} size={32} color={COLORS.white} />
            </View>
            <Text style={[styles.dashTitle, { color: item.color }]}>{item.title}</Text>
            <Text style={styles.dashSubtitle}>{item.subtitle}</Text>
        </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        
        {renderHeader()}
        
        {renderAlertBanner()}

        <FlatList
            data={DASHBOARD_ITEMS}
            keyExtractor={item => item.id}
            renderItem={renderDashboardCard}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={
                <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={() => { setRefreshing(true); fetchDashboardData(); }} 
                    tintColor={COLORS.primary}
                />
            }
        />
      </View>

      {/* FAB: ATALHO PARA MISSÕES (Abre o gerenciador, que tem o botão de criar) */}
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('MissionManager', { familyId: profile.family_id })}
      >
        <View style={styles.fabShadow} />
        <View style={styles.fabFront}>
             <MaterialCommunityIcons name="plus" size={40} color={COLORS.white} />
        </View>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 50 },

  // HEADER
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greetingText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.surface, opacity: 0.9 },
  familyText: { fontFamily: FONTS.bold, fontSize: 28, color: COLORS.surface, width: width * 0.65 },
  
  // INVITE BTN (AGORA É O BOTÃO DE GESTÃO)
  inviteBtn: { width: 50, height: 50, position: 'relative' },
  inviteBtnShadow: { position: 'absolute', top: 4, left: 0, width: '100%', height: '100%', backgroundColor: COLORS.shadow, borderRadius: 12 },
  inviteBtnFront: { width: '100%', height: '100%', backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 2, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginTop: -2 },

  // ALERT BANNER
  alertContainer: { height: 90, marginBottom: 25, position: 'relative', width: '100%' },
  alertShadow: { position: 'absolute', top: 4, left: 0, width: '100%', height: '100%', backgroundColor: COLORS.shadow, borderRadius: 20 },
  alertFront: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 3, borderColor: COLORS.error, padding: 15 },
  alertIconBox: { width: 50, height: 50, backgroundColor: COLORS.error, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 2, borderColor: COLORS.primary },
  alertTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.error },
  alertDesc: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textPrimary, flexWrap: 'wrap' },

  // DASHBOARD GRID CARDS
  dashCardWrapper: { width: CARD_WIDTH, height: 160, marginBottom: 20, position: 'relative' },
  dashCardShadow: { position: 'absolute', top: 6, left: 0, width: '100%', height: '100%', backgroundColor: COLORS.shadow, borderRadius: 24 },
  dashCardFront: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 24, borderWidth: 3, padding: 15, alignItems: 'center', justifyContent: 'center' },
  
  dashIconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 2, borderColor: COLORS.primary },
  dashTitle: { fontFamily: FONTS.bold, fontSize: 14, textAlign: 'center', marginBottom: 4 },
  dashSubtitle: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.placeholder, textAlign: 'center' },

  // FAB
  fab: { position: 'absolute', bottom: 30, right: 20, width: 64, height: 64 },
  fabShadow: { position: 'absolute', top: 5, left: 0, width: '100%', height: '100%', backgroundColor: COLORS.shadow, borderRadius: 20 },
  fabFront: { width: '100%', height: '100%', backgroundColor: COLORS.gold, borderRadius: 20, borderWidth: 3, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginTop: -2 },
});