import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ImageBackground
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../styles/theme';

export default function RecruitHomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { profile } = route.params || {};

  const [todoMissions, setTodoMissions] = useState([]);
  const [missedMissions, setMissedMissions] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(profile?.balance || 0);

  const [activeTab, setActiveTab] = useState('todo'); 

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
        const { data: updatedProfile } = await supabase.from('profiles').select('balance').eq('id', profile.id).single();
        if (updatedProfile) setCurrentBalance(updatedProfile.balance);

        const { data: allMissions, error } = await supabase
            .from('missions')
            .select('*')
            .eq('family_id', profile.family_id)
            .eq('status', 'active');

        if (error) throw error;

        const todayStr = new Date().toISOString().split('T')[0]; 
        const { data: attempts } = await supabase
            .from('mission_attempts')
            .select('mission_id, status')
            .eq('profile_id', profile.id)
            .gte('created_at', todayStr);

        const doneIds = new Set(attempts?.map(a => a.mission_id));
        filterMissions(allMissions, doneIds);

    } catch (error) {
        console.log("Erro ao buscar missões:", error);
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
  };

  const filterMissions = (missions, doneIds) => {
      const today = new Date();
      const currentDayIndex = today.getDay(); 
      const nowTime = today.getHours() * 60 + today.getMinutes();

      const listTodo = [];
      const listMissed = [];

      missions.forEach(mission => {
          if (doneIds.has(mission.id)) return;
          if (mission.assigned_to && mission.assigned_to !== profile.id) return;

          if (mission.is_recurring && mission.recurrence_days) {
              const isToday = mission.recurrence_days.includes(currentDayIndex) || 
                              mission.recurrence_days.includes(String(currentDayIndex));
              if (!isToday) return;
          }

          let isExpired = false;
          if (mission.deadline) {
              const [h, m] = mission.deadline.split(':').map(Number);
              if (nowTime > (h * 60 + m)) isExpired = true;
          }

          if (isExpired) listMissed.push(mission);
          else listTodo.push(mission);
      });

      setTodoMissions(listTodo);
      setMissedMissions(listMissed);
  };

  // --- NOVO DESIGN DO CARD (LISTA LARGA) ---
  const renderMissionCard = ({ item, isMissed }) => {
    const isCustomReward = item.reward_type === 'custom';
    
    // Cores de Identidade
    let accentColor = '#10B981'; // Verde (Moeda)
    let iconName = item.icon || "star";
    
    if (isCustomReward) {
        accentColor = '#8B5CF6'; // Roxo (Prêmio)
        iconName = "gift";
    }
    
    if (isMissed) {
        accentColor = '#9CA3AF'; // Cinza (Perdido)
        iconName = "clock-alert";
    }

    return (
        <TouchableOpacity 
            style={[styles.cardContainer, isMissed && styles.cardContainerMissed]}
            activeOpacity={0.9}
            onPress={() => {
                if (isMissed) {
                    Alert.alert("Tempo Esgotado", "O prazo acabou. Tente novamente amanhã!");
                } else {
                    navigation.navigate('MissionDetail', { mission: item, profile: profile });
                }
            }}
        >
            {/* Lateral Colorida (Indicador Visual) */}
            <View style={[styles.cardAccentStrip, { backgroundColor: accentColor }]} />

            {/* Conteúdo do Card */}
            <View style={styles.cardContent}>
                
                {/* Ícone Grande com Fundo Suave */}
                <View style={[styles.iconBox, { backgroundColor: isMissed ? '#E5E7EB' : `${accentColor}20` }]}>
                    <MaterialCommunityIcons name={iconName} size={32} color={accentColor} />
                </View>

                {/* Textos */}
                <View style={styles.textContainer}>
                    <Text style={[styles.cardTitle, isMissed && styles.textMissed]} numberOfLines={1}>
                        {item.title}
                    </Text>
                    
                    {isMissed ? (
                        <Text style={styles.deadlineText}>Perdida às {item.deadline?.slice(0,5)}</Text>
                    ) : (
                        <Text style={styles.deadlineText}>
                            {item.deadline ? `Até as ${item.deadline.slice(0,5)}` : "Disponível o dia todo"}
                        </Text>
                    )}
                </View>

                {/* Badge de Recompensa (Pílula) */}
                {!isMissed && (
                    <View style={[styles.rewardBadge, { borderColor: accentColor }]}>
                        {isCustomReward ? (
                             <MaterialCommunityIcons name="gift-open" size={16} color={accentColor} />
                        ) : (
                             <MaterialCommunityIcons name="circle-multiple" size={16} color={COLORS.gold} />
                        )}
                        <Text style={[styles.rewardValue, { color: isCustomReward ? accentColor : '#B45309' }]}>
                            {isCustomReward ? "Prêmio" : item.reward}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      
      {/* HEADER HEROICO */}
      <View style={styles.heroHeader}>
          <View style={styles.heroContent}>
              
              {/* Avatar e Infos */}
              <View style={styles.avatarSection}>
                  <View style={styles.avatarRing}>
                      <View style={styles.avatarImage}>
                         <MaterialCommunityIcons name="account" size={45} color="#fff" />
                      </View>
                      <View style={styles.rankBadge}>
                          <Text style={styles.rankText}>NV. 1</Text>
                      </View>
                  </View>
                  <View>
                      <Text style={styles.welcomeLabel}>BEM-VINDO AO QG</Text>
                      <Text style={styles.soldierName}>{profile?.name}</Text>
                  </View>
              </View>

              {/* Placa de Dinheiro */}
              <View style={styles.moneyPlate}>
                  <MaterialCommunityIcons name="circle-multiple" size={28} color="#FFD700" style={styles.moneyIcon}/>
                  <Text style={styles.moneyText}>{currentBalance}</Text>
              </View>
          </View>
      </View>

      {/* CORPO DA PÁGINA */}
      <View style={styles.body}>
          
          {/* ABAS MODERNAS (PILLS) */}
          <View style={styles.pillTabs}>
              <TouchableOpacity 
                style={[styles.pill, activeTab === 'todo' && styles.pillActive]} 
                onPress={() => setActiveTab('todo')}
              >
                  <Text style={[styles.pillText, activeTab === 'todo' && styles.pillTextActive]}>
                      MISSÕES ({todoMissions.length})
                  </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.pill, activeTab === 'missed' && styles.pillActive]} 
                onPress={() => setActiveTab('missed')}
              >
                  <Text style={[styles.pillText, activeTab === 'missed' && styles.pillTextActive]}>
                      PERDIDAS ({missedMissions.length})
                  </Text>
              </TouchableOpacity>
          </View>

          {/* LISTA DE MISSÕES */}
          {loading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
          ) : (
              <FlatList
                  data={activeTab === 'todo' ? todoMissions : missedMissions}
                  keyExtractor={item => item.id}
                  renderItem={({item}) => renderMissionCard({ item, isMissed: activeTab === 'missed' })}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
                  refreshControl={
                      <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={COLORS.primary}/>
                  }
                  ListEmptyComponent={() => (
                      <View style={styles.emptyState}>
                          <MaterialCommunityIcons 
                            name={activeTab === 'todo' ? "shield-check" : "clock-check-outline"} 
                            size={80} 
                            color="#CBD5E1" 
                          />
                          <Text style={styles.emptyTitle}>
                              {activeTab === 'todo' ? "Área Limpa!" : "Nenhuma falha."}
                          </Text>
                          <Text style={styles.emptySubtitle}>
                              {activeTab === 'todo' ? "Você completou tudo por hoje." : "Você é um soldado exemplar."}
                          </Text>
                      </View>
                  )}
              />
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' }, // Fundo bem claro
  
  // --- HERO HEADER ---
  heroHeader: {
      backgroundColor: COLORS.primary,
      paddingTop: 60,
      paddingBottom: 30,
      paddingHorizontal: 20,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      shadowColor: "#059669",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 10,
      zIndex: 10,
  },
  heroContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  avatarRing: { position: 'relative' },
  avatarImage: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  rankBadge: { position: 'absolute', bottom: -5, right: -5, backgroundColor: COLORS.gold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: '#fff' },
  rankText: { fontSize: 10, fontWeight: 'bold', color: '#B45309' },
  
  welcomeLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  soldierName: { fontSize: 22, color: '#fff', fontFamily: FONTS.bold },

  moneyPlate: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  moneyText: { color: '#FFD700', fontSize: 20, fontFamily: FONTS.bold },
  moneyIcon: { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 4 },

  // --- BODY & TABS ---
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  
  pillTabs: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 25, padding: 4, marginBottom: 15 },
  pill: { flex: 1, paddingVertical: 10, borderRadius: 22, alignItems: 'center' },
  pillActive: { backgroundColor: '#fff', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  pillText: { fontSize: 12, fontWeight: 'bold', color: '#64748B' },
  pillTextActive: { color: COLORS.primary },

  // --- MISSION CARD (NEW DESIGN) ---
  cardContainer: {
      flexDirection: 'row',
      backgroundColor: '#fff',
      borderRadius: 20,
      marginBottom: 15,
      height: 90,
      overflow: 'hidden',
      // Sombra Suave
      shadowColor: "#64748B",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
  },
  cardContainerMissed: { opacity: 0.6, backgroundColor: '#F1F5F9' },
  
  cardAccentStrip: { width: 6, height: '100%' },
  
  cardContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 15 },
  
  iconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  
  textContainer: { flex: 1, justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.textPrimary, marginBottom: 4 },
  textMissed: { color: '#64748B', textDecorationLine: 'line-through' },
  deadlineText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },

  rewardBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, backgroundColor: '#FAFAFA', gap: 6 },
  rewardValue: { fontSize: 14, fontWeight: 'bold' },

  // --- EMPTY STATE ---
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 20, fontFamily: FONTS.bold, color: '#334155', marginTop: 20 },
  emptySubtitle: { fontSize: 14, color: '#94A3B8', marginTop: 5 },
});