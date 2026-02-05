import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  FlatList, 
  RefreshControl 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // Importante: useFocusEffect
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function RoleSelectionScreen() {
  const navigation = useNavigation();
  const { session, signOut } = useAuth(); // Importamos o signOut
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Recarrega sempre que a tela ganha foco (ex: ao voltar de outra tela)
  useFocusEffect(
    useCallback(() => {
      fetchProfiles();
    }, [])
  );

  const fetchProfiles = async () => {
    try {
      if (!session?.user) return;
      
      // 1. Descobrir a família (seja criador ou membro via perfil)
      // Buscamos primeiro se ele tem um profile, pois é o vínculo mais forte
      const { data: myProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('user_id', session.user.id)
        .maybeSingle(); // maybeSingle não dá erro se não achar

      let familyId = myProfile?.family_id;

      // Se não achou perfil, tenta ver se ele criou alguma família (fallback)
      if (!familyId) {
          const { data: createdFamily } = await supabase
            .from('families')
            .select('id')
            .eq('created_by', session.user.id)
            .maybeSingle();
          familyId = createdFamily?.id;
      }

      if (!familyId) {
          // Se não tem família nem perfil, a lista fica vazia
          setProfiles([]);
          setLoading(false);
          return;
      }

      // 2. Buscar TODOS os perfis dessa família
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('family_id', familyId)
        .order('role', { ascending: true }); // Capitães primeiro

      if (profilesError) throw profilesError;

      setProfiles(profilesData || []);

    } catch (error) {
      console.log("Erro ao buscar perfis:", error);
      // Não mostramos alerta aqui para não travar o fluxo se estiver vazio
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleProfileSelect = (profile) => {
    if (profile.role === 'captain') {
      navigation.replace('CaptainHome', { profile: profile });
    } else {
      navigation.replace('RecruitHome', { profile: profile });
    }
  };

  const handleLogout = async () => {
    await signOut();
    // O AuthContext vai detectar null e o AppNavigator vai jogar para Welcome automaticamente
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4c1d95" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      {/* CABEÇALHO COM LOGOUT */}
      <View style={styles.header}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <MaterialCommunityIcons name="logout" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
      </View>

      <Text style={styles.title}>Quem está no comando?</Text>
      <Text style={styles.subtitle}>
         {profiles.length > 0 ? "Selecione seu perfil" : "Nenhum perfil encontrado nesta família"}
      </Text>

      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfiles(); }} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[
                styles.card, 
                item.role === 'captain' ? styles.cardCaptain : styles.cardRecruit
            ]}
            onPress={() => handleProfileSelect(item)}
          >
            <View style={[
                styles.avatarCircle, 
                { backgroundColor: item.role === 'captain' ? '#f3e8ff' : '#d1fae5' }
            ]}>
                <MaterialCommunityIcons 
                    name={item.role === 'captain' ? "crown" : "emoticon-excited-outline"} 
                    size={32} 
                    color={item.role === 'captain' ? '#4c1d95' : '#059669'} 
                />
            </View>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.role}>
                {item.role === 'captain' ? 'Capitão' : 'Recruta'}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
            <View style={{marginTop: 50, alignItems: 'center'}}>
                <Text style={{color: '#999'}}>Parece que os dados foram resetados.</Text>
                <Text style={{color: '#999'}}>Saia da conta e crie uma nova.</Text>
            </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', paddingTop: 50, paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { alignItems: 'flex-end', marginBottom: 10 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  logoutText: { color: '#ef4444', marginLeft: 5, fontWeight: 'bold' },

  title: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30 },
  
  listContent: { alignItems: 'center', paddingBottom: 40 },
  
  card: {
    width: 140,
    height: 160,
    backgroundColor: '#fff',
    borderRadius: 20,
    margin: 10,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 }
  },
  cardCaptain: { borderWidth: 2, borderColor: '#e9d5ff' },
  cardRecruit: { borderWidth: 2, borderColor: '#a7f3d0' },
  
  avatarCircle: {
    width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10
  },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  role: { fontSize: 12, color: '#888', textTransform: 'uppercase', marginTop: 4, letterSpacing: 1 },
});