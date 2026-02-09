import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../styles/theme';

export default function FamilySettingsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { familyId, currentProfileId } = route.params;

  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFamilyData();
  }, []);

  const fetchFamilyData = async () => {
    setLoading(true);
    try {
        // 1. Busca dados da Família (incluindo o código)
        const { data: familyData } = await supabase
            .from('families')
            .select('*')
            .eq('id', familyId)
            .single();
        
        setFamily(familyData);

        // 2. Busca membros
        const { data: membersData } = await supabase
            .from('profiles')
            .select('*')
            .eq('family_id', familyId)
            .order('role', { ascending: true }); // Captain primeiro (ordem alfabética C vem antes de R)
        
        setMembers(membersData || []);

    } catch (error) {
        console.log(error);
        Alert.alert("Erro", "Não foi possível carregar os dados.");
    } finally {
        setLoading(false);
    }
  };

  const copyToClipboard = async () => {
      if (family?.invite_code) {
          await Clipboard.setStringAsync(family.invite_code);
          Alert.alert("Copiado!", "Código copiado para a área de transferência.");
      }
  };

  const shareCode = async () => {
      if (family?.invite_code) {
          await Share.share({
              message: `Entre na minha equipe no Chonko Task! Use o código: ${family.invite_code}`,
          });
      }
  };

  const handlePromote = (member) => {
      Alert.alert(
          "Promover a Capitão?",
          `${member.name} terá acesso total para criar missões e aprovar tarefas.`,
          [
              { text: "Cancelar", style: "cancel" },
              { 
                  text: "Promover", 
                  onPress: async () => {
                      const { error } = await supabase
                          .from('profiles')
                          .update({ role: 'captain' })
                          .eq('id', member.id);
                      
                      if (!error) {
                          Alert.alert("Sucesso", `${member.name} agora é Capitão!`);
                          fetchFamilyData();
                      }
                  }
              }
          ]
      );
  };

  const handleDemote = (member) => {
    Alert.alert(
        "Rebaixar para Recruta?",
        `${member.name} perderá o acesso de admin.`,
        [
            { text: "Cancelar", style: "cancel" },
            { 
                text: "Rebaixar", 
                onPress: async () => {
                    const { error } = await supabase
                        .from('profiles')
                        .update({ role: 'recruit' })
                        .eq('id', member.id);
                    
                    if (!error) {
                        Alert.alert("Sucesso", `${member.name} agora é Recruta.`);
                        fetchFamilyData();
                    }
                }
            }
        ]
    );
};

  const renderMember = ({ item }) => {
      const isMe = item.id === currentProfileId;
      const isCaptain = item.role === 'captain';

      return (
          <View style={styles.memberCard}>
              <View style={styles.memberInfo}>
                  <View style={[styles.avatarBox, isCaptain ? {borderColor: COLORS.gold} : {borderColor: COLORS.primary}]}>
                      <MaterialCommunityIcons name={isCaptain ? "crown" : "account"} size={24} color={isCaptain ? COLORS.gold : COLORS.primary} />
                  </View>
                  <View>
                      <Text style={styles.memberName}>{item.name} {isMe && "(Você)"}</Text>
                      <Text style={[styles.memberRole, {color: isCaptain ? '#b45309' : '#15803d'}]}>
                          {isCaptain ? "CAPITÃO" : "RECRUTA"}
                      </Text>
                  </View>
              </View>

              {/* Botão de Ação (Só aparece se não for eu mesmo) */}
              {!isMe && (
                  <TouchableOpacity 
                      style={styles.actionBtn}
                      onPress={() => isCaptain ? handleDemote(item) : handlePromote(item)}
                  >
                      <MaterialCommunityIcons 
                          name={isCaptain ? "arrow-down-bold-box-outline" : "arrow-up-bold-box-outline"} 
                          size={28} 
                          color={COLORS.placeholder} 
                      />
                  </TouchableOpacity>
              )}
          </View>
      );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GERENCIAR TROPA</Text>
        <View style={{width: 28}} /> 
      </View>

      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop:50}} /> : (
          <View style={styles.content}>
              
              {/* CARTÃO DO CÓDIGO */}
              <View style={styles.codeCard}>
                  <Text style={styles.codeLabel}>CÓDIGO DA TROPA</Text>
                  <TouchableOpacity style={styles.codeBox} onPress={copyToClipboard}>
                      <Text style={styles.codeText}>{family?.invite_code || "..."}</Text>
                      <MaterialCommunityIcons name="content-copy" size={20} color={COLORS.placeholder} />
                  </TouchableOpacity>
                  <Text style={styles.codeDesc}>Use este código para adicionar outro dispositivo (filho ou cônjuge).</Text>
                  
                  <TouchableOpacity style={styles.shareBtn} onPress={shareCode}>
                      <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
                      <Text style={styles.shareText}>COMPARTILHAR CÓDIGO</Text>
                  </TouchableOpacity>
              </View>

              <Text style={styles.sectionTitle}>MEMBROS</Text>
              <FlatList 
                  data={members}
                  keyExtractor={item => item.id}
                  renderItem={renderMember}
                  contentContainerStyle={{paddingBottom: 50}}
              />

          </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.surface, letterSpacing: 1 },
  backBtn: { padding: 5, backgroundColor: COLORS.surface, borderRadius: 10 },
  content: { padding: 20, flex: 1 },

  // Code Card
  codeCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, marginBottom: 30, borderWidth: 3, borderColor: COLORS.primary, alignItems: 'center' },
  codeLabel: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.primary, marginBottom: 10 },
  codeBox: { flexDirection: 'row', backgroundColor: '#F3F4F6', paddingHorizontal: 20, paddingVertical: 15, borderRadius: 12, alignItems: 'center', gap: 10, borderWidth: 2, borderColor: '#E5E7EB', marginBottom: 10 },
  codeText: { fontFamily: FONTS.bold, fontSize: 32, color: COLORS.textPrimary, letterSpacing: 4 },
  codeDesc: { fontFamily: FONTS.regular, fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 15 },
  shareBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center', gap: 8 },
  shareText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 14 },

  // Members
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.surface, marginBottom: 15 },
  memberCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, padding: 15, borderRadius: 16, marginBottom: 10, borderWidth: 2, borderColor: '#E5E7EB' },
  memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  avatarBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  memberName: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.textPrimary },
  memberRole: { fontFamily: FONTS.bold, fontSize: 12 },
  actionBtn: { padding: 10 },
});