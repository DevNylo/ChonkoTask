import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, ImageBackground, KeyboardAvoidingView,
  LayoutAnimation, Modal, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View, StatusBar
} from 'react-native';
import { supabase } from '../../lib/supabase';

// TEMA
import { COLORS, FONTS } from '../../styles/theme';

const ARCHETYPES = [
    { label: 'Capitão', value: 'Capitão', icon: 'shield-account', gender: 'M' },
    { label: 'Capitã', value: 'Capitã', icon: 'shield-account-outline', gender: 'F' },
    { label: 'Rei', value: 'Rei', icon: 'crown', gender: 'M' },
    { label: 'Rainha', value: 'Rainha', icon: 'crown-outline', gender: 'F' },
    { label: 'Pai', value: 'Papai', icon: 'human-male-boy', gender: 'M' },
    { label: 'Mãe', value: 'Mamãe', icon: 'human-female-girl', gender: 'F' },
    { label: 'Super Avô', value: 'Vovô', icon: 'human-cane', gender: 'M' },
    { label: 'Super Avó', value: 'Vovó', icon: 'human-female', gender: 'F' },
    { label: 'Super Tio', value: 'Tio', icon: 'account-tie', gender: 'M' },
    { label: 'Super Tia', value: 'Tia', icon: 'face-woman-profile', gender: 'F' },
];

const PremiumInput = ({ label, icon, ...props }) => (
  <View style={{ marginBottom: 16 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
          <MaterialCommunityIcons name={icon} size={24} color={COLORS.primary} style={{ marginLeft: 15 }} />
          <TextInput 
              style={styles.textInput}
              placeholderTextColor={COLORS.placeholder}
              cursorColor={COLORS.primary}
              {...props}
          />
      </View>
  </View>
);

export default function RegisterCaptainScreen() {
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Passo 1 - Auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Passo 2 - Perfil
  const [birthDate, setBirthDate] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [selectedArchetype, setSelectedArchetype] = useState(null); 
  const [captainName, setCaptainName] = useState('');
  
  // Segurança
  const [pin, setPin] = useState('');
  const [mathChallenge, setMathChallenge] = useState({ question: '', answer: 0 });
  const [userMathAnswer, setUserMathAnswer] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const totalSteps = 2;

  useEffect(() => { generateMathChallenge(); }, []);

  const generateMathChallenge = () => {
    const n1 = Math.floor(Math.random() * 7) + 6; 
    const n2 = Math.floor(Math.random() * 7) + 3;
    const isMultiplication = Math.random() > 0.3; 
    if (isMultiplication) {
        setMathChallenge({ question: `${n1} x ${n2}`, answer: n1 * n2 });
    } else {
        const bigN = n1 * 3; 
        const bigN2 = n2 * 4;
        setMathChallenge({ question: `${bigN} + ${bigN2}`, answer: bigN + bigN2 });
    }
  };

  const handleDateChange = (text) => {
      let clean = text.replace(/\D/g, '');
      if (clean.length > 8) clean = clean.substring(0, 8);
      let formatted = clean;
      if (clean.length > 2) formatted = `${clean.slice(0, 2)}/${clean.slice(2)}`;
      if (clean.length > 4) formatted = `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
      setBirthDate(formatted);
  };

  const isAdult = (dateString) => {
      if (dateString.length !== 10) return false;
      const [day, month, year] = dateString.split('/').map(Number);
      const birth = new Date(year, month - 1, day);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) { age--; }
      return age >= 18;
  };

  const handleNextStep = () => {
      if (currentStep === 1) {
          if (!email || !password) return Alert.alert("Opa!", "Preencha email e senha.");
          if (password.length < 8) return Alert.alert("Senha fraca", "Mínimo 8 caracteres.");
          
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setCurrentStep(2);
      } else {
          handleCreateHQ();
      }
  };

  const handlePrevStep = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentStep(1);
  };

  const getSubmitLabel = () => {
    if (currentStep === 1) return "CONTINUAR";
    if (!selectedArchetype) return "CRIAR CONTA";
    return "FINALIZAR CADASTRO"; 
  };

  const handleCreateHQ = async () => {
    if (!birthDate || !selectedArchetype || !familyName || !captainName || !pin || !userMathAnswer) {
      return Alert.alert("Faltam dados!", "Preencha todo o formulário.");
    }
    if (!isAdult(birthDate)) return Alert.alert("Acesso Restrito", "Necessário ser maior de 18 anos.");
    if (pin.length < 8) return Alert.alert("Segurança Fraca", "O PIN precisa ter exatamente 8 dígitos.");
    if (String(userMathAnswer).trim() !== String(mathChallenge.answer)) {
        generateMathChallenge(); setUserMathAnswer('');
        return Alert.alert("Acesso Negado", "Resposta incorreta. Tente novamente.");
    }

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar conta.");
      const userId = authData.user.id;

      const { data: familyData, error: familyError } = await supabase
        .from('families').insert([{ name: familyName, created_by: userId }]).select().single();
      if (familyError) throw familyError;

      const [day, month, year] = birthDate.split('/');
      const isoBirthDate = `${year}-${month}-${day}`; 

      const { error: profileError } = await supabase.from('profiles').insert([{
            user_id: userId, family_id: familyData.id, name: captainName, role: 'captain',
            gender: selectedArchetype.gender, title_archetype: selectedArchetype.label, 
            pin: pin, birth_date: isoBirthDate, avatar: 'crown-placeholder'
        }]);
      if (profileError) throw profileError;

    } catch (error) {
      Alert.alert("Erro no QG", error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectArchetype = (item) => {
      setSelectedArchetype(item); setCaptainName(item.value); setShowModal(false);
  };

  return (
    <ImageBackground 
        source={require('../../../assets/FamillyCreate.png')} 
        style={styles.container} resizeMode="cover"
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* HEADER */}
            <View style={styles.headerContainer}>
                <View style={styles.iconCircle}>
                    <MaterialCommunityIcons 
                        name={selectedArchetype ? selectedArchetype.icon : (currentStep === 1 ? "lock-open-check" : "account-details")} 
                        size={32} color={COLORS.primary} 
                    />
                </View>
                <View>
                    <Text style={styles.headerTitle}>{currentStep === 1 ? "Criar Acesso" : "Perfil do Capitão"}</Text>
                    <Text style={styles.headerSubtitle}>{currentStep === 1 ? "Seus dados de login" : "Configure sua identidade"}</Text>
                </View>
            </View>

            {/* PROGRESSO */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: currentStep === 1 ? '50%' : '100%' }]} />
                </View>
                <Text style={styles.stepText}>Etapa {currentStep} de {totalSteps}</Text>
            </View>

            {/* CARD COM SOMBRA SALTADA */}
            <View style={styles.cardWrapper}>
                {/* SOMBRA SALTADA */}
                <View style={styles.cardShadow} />
                
                {/* CONTEÚDO DO CARD */}
                <View style={styles.cardFront}>
                    
                    {currentStep === 1 && (
                        <View>
                            <PremiumInput 
                                label="EMAIL" 
                                icon="email-outline" 
                                placeholder="chonko@email.com" 
                                value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" 
                            />
                            <PremiumInput 
                                label="SENHA" 
                                icon="lock-outline" 
                                placeholder="Mínimo 8 caracteres" 
                                secureTextEntry
                                value={password} onChangeText={setPassword} 
                            />
                        </View>
                    )}

                    {currentStep === 2 && (
                        <View>
                            <PremiumInput label="NOME DA TROPA (FAMÍLIA)" icon="account-group-outline" placeholder="Ex: Família Silva"
                                value={familyName} onChangeText={setFamilyName} />
                            
                            <PremiumInput label="DATA DE NASCIMENTO" icon="calendar-month-outline" placeholder="DD/MM/AAAA"
                                value={birthDate} onChangeText={handleDateChange} keyboardType="numeric" maxLength={10} />

                            <View style={{marginBottom: 16}}>
                                <Text style={styles.inputLabel}>SEU TÍTULO</Text>
                                <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowModal(true)} activeOpacity={0.8}>
                                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                        <MaterialCommunityIcons name={selectedArchetype ? selectedArchetype.icon : "crown-outline"} 
                                            size={24} color={COLORS.primary} style={{marginRight: 12}} />
                                        <Text style={[styles.dropdownText, {color: selectedArchetype ? COLORS.primary : COLORS.placeholder}]}>
                                            {selectedArchetype ? selectedArchetype.label : "Selecione..."}
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-down" size={24} color={COLORS.primary} />
                                </TouchableOpacity>
                            </View>

                            <PremiumInput label="NOME DE GUERRA" icon="badge-account-outline" placeholder="Ex: Capitão Beto"
                                value={captainName} onChangeText={setCaptainName} />

                            <View style={styles.securityBox}>
                                <View style={styles.securityHeader}>
                                    <MaterialCommunityIcons name="shield-check" size={20} color={COLORS.primary} />
                                    <Text style={styles.securityTitle}>SEGURANÇA DOS PAIS</Text>
                                </View>
                                
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <View style={{ flex: 1 }}>
                                        <PremiumInput label={`QUANTO É ${mathChallenge.question}?`} icon="calculator" placeholder="?" 
                                            keyboardType="numeric" value={userMathAnswer} onChangeText={setUserMathAnswer} />
                                    </View>
                                    <View style={{ width: 140 }}>
                                        <PremiumInput label="PIN (8 Dígitos)" icon="dialpad" placeholder="1234..." 
                                            keyboardType="numeric" maxLength={8} secureTextEntry value={pin} onChangeText={setPin} />
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* BOTÕES DENTRO DO CARD */}
                    <View style={styles.footerNavigation}>
                        <TouchableOpacity onPress={() => {
                                if (currentStep === 1) navigation.goBack();
                                else handlePrevStep();
                            }} style={styles.backButton}>
                            <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.nextButton} activeOpacity={0.8} onPress={handleNextStep}>
                            <View style={styles.btnShadow} />
                            <View style={styles.btnFront}>
                                {loading ? <ActivityIndicator color="#FFF" /> : (
                                    <>
                                        <Text style={styles.buttonText}>{getSubmitLabel()}</Text>
                                        <MaterialCommunityIcons name={currentStep === 1 ? "arrow-right" : "check"} size={24} color="#FFF" style={{ marginLeft: 8 }} />
                                    </>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            
            <View style={{ height: 100 }} />
        </ScrollView>

        <Modal visible={showModal} transparent={true} animationType="fade" onRequestClose={() => setShowModal(false)}>
            <View style={styles.modalOverlay}>
                <TouchableOpacity style={{flex:1}} onPress={() => setShowModal(false)} />
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>ESCOLHA SEU TÍTULO</Text>
                    <ScrollView style={{maxHeight: 300}} showsVerticalScrollIndicator={false}>
                        {ARCHETYPES.map((item, index) => (
                            <TouchableOpacity key={index} style={styles.modalItem} onPress={() => selectArchetype(item)}>
                                <View style={styles.modalIconBox}>
                                    <MaterialCommunityIcons name={item.icon} size={24} color={COLORS.primary} />
                                </View>
                                <Text style={styles.modalItemText}>{item.label}</Text>
                                <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <TouchableOpacity style={styles.closeModalButton} onPress={() => setShowModal(false)}>
                        <Text style={styles.closeModalText}>FECHAR</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingHorizontal: 25, paddingTop: 60 },
  
  // Header
  headerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconCircle: { 
      width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF', 
      justifyContent: 'center', alignItems: 'center', marginRight: 15, 
      borderWidth: 1, // Borda 1px
      borderColor: COLORS.primary,
      shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 
  },
  headerTitle: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.primary },
  headerSubtitle: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.primary, opacity: 0.8 },

  // Progress
  progressContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
  progressBarBg: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 4, marginRight: 15, borderWidth: 1, borderColor: COLORS.primary },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  stepText: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 14 },

  // --- CARD COM SOMBRA SALTADA ---
  cardWrapper: { 
      position: 'relative', 
      marginBottom: 20
  },
  cardShadow: {
      position: 'absolute', 
      top: 8, 
      left: 6, 
      width: '100%', 
      height: '100%', 
      backgroundColor: COLORS.shadow, 
      borderRadius: 24,
      opacity: 0.3
  },
  cardFront: {
      backgroundColor: '#FFF', 
      borderRadius: 24, 
      padding: 24,
      borderWidth: 1, // Borda 1px
      borderColor: COLORS.primary // Verde Escuro
  },

  // Inputs
  inputLabel: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.primary, marginBottom: 6, letterSpacing: 0.5, paddingLeft: 2 },
  inputWrapper: { 
      flexDirection: 'row', alignItems: 'center', 
      backgroundColor: '#F8FAFC', 
      borderRadius: 14, 
      height: 56, 
      borderWidth: 1, // Borda 1px
      borderColor: COLORS.primary 
  },
  textInput: { flex: 1, paddingHorizontal: 12, fontSize: 16, fontFamily: FONTS.bold, color: COLORS.primary },
  
  dropdownButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', borderRadius: 14, height: 56, paddingHorizontal: 15,
    borderWidth: 1, // Borda 1px
    borderColor: COLORS.primary
  },
  dropdownText: { fontSize: 16, fontFamily: FONTS.bold },

  // Security
  securityBox: { marginTop: 15, backgroundColor: '#F0FDF4', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: COLORS.primary },
  securityHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8 },
  securityTitle: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 0.5 },

  // Footer Buttons
  footerNavigation: { flexDirection: 'row', alignItems: 'center', marginTop: 30, gap: 15 },
  
  backButton: { 
      width: 56, height: 56, justifyContent: 'center', alignItems: 'center', 
      borderRadius: 16, backgroundColor: '#FFF', 
      borderWidth: 1, // Borda 1px
      borderColor: COLORS.primary 
  },
  
  // Botão Next
  nextButton: { flex: 1, height: 56, position: 'relative' },
  btnShadow: { position: 'absolute', top: 4, left: 0, width: '100%', height: '100%', backgroundColor: COLORS.shadow, borderRadius: 16 },
  btnFront: { 
      width: '100%', height: '100%', backgroundColor: COLORS.primary, 
      borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', 
      marginTop: -2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' 
  },
  buttonText: { fontFamily: FONTS.bold, fontSize: 18, color: '#FFF', letterSpacing: 0.5 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(6, 78, 59, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { 
      width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 20,
      borderWidth: 1, borderColor: COLORS.primary,
      shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, elevation: 10
  },
  modalTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.primary, textAlign: 'center', marginBottom: 15 },
  modalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalIconBox: { 
      width: 44, height: 44, borderRadius: 14, backgroundColor: '#F0FDF4', 
      justifyContent: 'center', alignItems: 'center', marginRight: 15,
      borderWidth: 1, borderColor: COLORS.primary 
  },
  modalItemText: { flex: 1, fontSize: 16, fontFamily: FONTS.bold, color: COLORS.primary },
  closeModalButton: { marginTop: 20, padding: 15, backgroundColor: '#F8FAFC', borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary },
  closeModalText: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 14 },
});