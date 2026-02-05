import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, 
  Alert, ScrollView, Modal, ActivityIndicator, Share 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function CaptainHomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { session } = useAuth();
  const { profile } = route.params || {}; 
  const [familyName, setFamilyName] = useState('Minha Família');
  
  const [activeMissions, setActiveMissions] = useState([]);
  const [pendingAttempts, setPendingAttempts] = useState(0);
  const [loading, setLoading] = useState(true);

  // Estados Convite
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState(null);
  const [generatingCode, setGeneratingCode] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (profile?.family_id) fetchDashboardData();
    }, [profile])
  );

  const fetchDashboardData = async () => {
    try {
      const { data: family } = await supabase.from('families').select('name').eq('id', profile.family_id).single();
      if (family) setFamilyName(family.name);

      const { data: missions } = await supabase.from('missions').select('*').eq('family_id', profile.family_id).eq('status', 'active');
      setActiveMissions(missions || []);

      const { count } = await supabase
        .from('mission_attempts')
        .select('id, profiles!inner(family_id)', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('profiles.family_id', profile.family_id);

      setPendingAttempts(count || 0);

    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  // ... (Manter funções handleGenerateInvite, generateCode, handleShareCode iguais ao anterior) ...
  // Vou omitir aqui para economizar espaço, mas mantenha as funções de convite!
  const generateCode = () => { const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let result = ''; for (let i = 0; i < 6; i++) { result += chars.charAt(Math.floor(Math.random() * chars.length)); } return result; };
  const handleGenerateInvite = async () => { setInviteModalVisible(true); setGeneratingCode(true); setInviteCode(null); try { const { data: existingInvite } = await supabase.from('active_invites').select('code, expires_at').eq('family_id', profile.family_id).gt('expires_at', new Date().toISOString()).maybeSingle(); if (existingInvite) { setInviteCode(existingInvite.code); setGeneratingCode(false); return; } const code = generateCode(); const expiresAt = new Date(new Date().getTime() + 15 * 60000).toISOString(); const { error } = await supabase.from('active_invites').insert([{ family_id: profile.family_id, code: code, expires_at: expiresAt, created_by: session.user.id }]); if (error) throw error; setInviteCode(code); } catch (error) { Alert.alert("Erro", "Falha ao gerar código."); setInviteModalVisible(false); } finally { setGeneratingCode(false); } };
  const handleShareCode = async () => { if (!inviteCode) return; try { await Share.share({ message: `Código Chonko: ${inviteCode}`, }); } catch (error) { console.log(error); } };

  const renderMissionCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name={item.icon || 'star'} size={24} color="#7c3aed" />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardReward}>{item.reward} moedas</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      
      {/* Modal Convite (Igual) */}
      <Modal animationType="slide" transparent={true} visible={inviteModalVisible} onRequestClose={() => setInviteModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Código de Acesso</Text>
                {generatingCode ? <ActivityIndicator size="large" color="#4c1d95"/> : 
                <TouchableOpacity onPress={handleShareCode} style={styles.codeContainer}><Text style={styles.codeText}>{inviteCode}</Text></TouchableOpacity>}
                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setInviteModalVisible(false)}><Text style={styles.closeModalText}>Fechar</Text></TouchableOpacity>
            </View>
        </View>
      </Modal>

      <LinearGradient colors={['#4c1d95', '#7c3aed']} style={styles.header}>
        <View style={styles.headerTopRow}>
            <View>
                <Text style={styles.greeting}>QG do Capitão</Text>
                <Text style={styles.familyTitle}>{familyName}</Text>
            </View>
            <View style={{flexDirection: 'row', gap: 10}}>
                <TouchableOpacity style={styles.iconBtn} onPress={handleGenerateInvite}>
                    <MaterialCommunityIcons name="account-plus" size={24} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>

        {/* --- NOVO: BANNER DE ALERTA DE APROVAÇÃO --- */}
        {pendingAttempts > 0 ? (
             <TouchableOpacity 
                style={styles.alertBanner}
                onPress={() => navigation.navigate('TaskApprovals', { familyId: profile.family_id })}
             >
                <View style={styles.alertIcon}>
                    <MaterialCommunityIcons name="bell-ring" size={24} color="#fff" />
                </View>
                <View style={{flex:1}}>
                    <Text style={styles.alertTitle}>Atenção, Capitão!</Text>
                    <Text style={styles.alertText}>{pendingAttempts} missões aguardam aprovação.</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#fff" />
             </TouchableOpacity>
        ) : (
            <View style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Missões Ativas</Text>
                    <Text style={styles.summaryValue}>{activeMissions.length}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Tudo em Dia</Text>
                    <MaterialCommunityIcons name="check-circle" size={24} color="#a7f3d0" style={{marginTop:5}} />
                </View>
            </View>
        )}
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={styles.sectionTitle}>Quadro de Missões</Text>
        <FlatList
            data={activeMissions}
            keyExtractor={item => item.id}
            renderItem={renderMissionCard}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={{color:'#999', textAlign:'center', marginTop:20}}>Nenhuma missão cadastrada.</Text>}
        />
        
        <TouchableOpacity style={styles.switchProfileBtn} onPress={() => navigation.navigate('RoleSelection')}>
            <Text style={{color: '#666'}}>🔄 Trocar de Perfil</Text>
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateTask', { familyId: profile.family_id })}>
        <MaterialCommunityIcons name="plus" size={36} color="#4c1d95" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  familyTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  
  // Estilo do Alerta (Novo)
  alertBanner: {
    backgroundColor: '#ef4444', borderRadius: 15, padding: 15, flexDirection: 'row', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: {width:0, height:2}
  },
  alertIcon: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 10, marginRight: 15 },
  alertTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  alertText: { color: '#fee2e2', fontSize: 13 },

  summaryCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 15, padding: 15 },
  summaryItem: { flex: 1, alignItems: 'center' },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  summaryLabel: { color: '#e9d5ff', fontSize: 12, marginBottom: 4 },
  summaryValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },

  body: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 10, alignItems: 'center', elevation: 1 },
  iconBox: { backgroundColor: '#f3f4f6', width: 45, height: 45, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cardReward: { fontSize: 14, color: '#059669', fontWeight: '600' },
  
  switchProfileBtn: { marginTop: 30, alignItems: 'center', padding: 10 },
  fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#fbbf24', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  codeContainer: { backgroundColor: '#f3e8ff', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center', marginBottom: 15 },
  codeText: { fontSize: 32, fontWeight: 'bold', color: '#4c1d95', letterSpacing: 2 },
  closeModalBtn: { padding: 10 },
  closeModalText: { color: '#ef4444', fontWeight: 'bold' }
});