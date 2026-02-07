import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native'; // <--- 1. IMPORT NOVO
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

// --- PALETA UNIFICADA (BRANDING CHONKO) ---
const COLORS = {
  primary: '#064E3B',    
  secondary: '#10B981',  
  accent: '#34D399',     
  white: '#FFFFFF',
  inputBg: 'rgba(6, 78, 59, 0.05)', 
  securityBg: '#F0FDF4', 
  error: '#EF4444',
  shadow: '#022C22',     
};

// --- LISTA DE ARQUÉTIPOS ---
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

// --- COMPONENTE DE INPUT ---
const ToonInput = ({ label, icon, ...props }) => (
  <View style={{ marginBottom: 15 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
          <View style={styles.iconArea}>
              <MaterialCommunityIcons name={icon} size={22} color={COLORS.primary} />
          </View>
          <TextInput 
              style={styles.textInput}
              placeholderTextColor="#9CA3AF"
              cursorColor={COLORS.primary}
              {...props}
          />
      </View>
  </View>
);

export default function RegisterCaptainScreen() {
  
  const navigation = useNavigation(); // <--- 2. INICIALIZAÇÃO DA NAVEGAÇÃO
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;

  // Passo 1 - Auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Passo 2 - Perfil
  const [birthDate, setBirthDate] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [selectedArchetype, setSelectedArchetype] = useState(null); 
  const [captainName, setCaptainName] = useState('');
  
  // Segurança Extra
  const [pin, setPin] = useState('');
  const [mathChallenge, setMathChallenge] = useState({ question: '', answer: 0 });
  const [userMathAnswer, setUserMathAnswer] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    generateMathChallenge();
  }, []);

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

  // --- LÓGICA DE IDADE ---
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

  // --- NAVEGAÇÃO INTERNA ---
  const handleNextStep = () => {
      if (currentStep === 1) {
          if (!email || !password) return Alert.alert("Opa!", "Preencha email e senha.");
          if (password.length < 6) return Alert.alert("Senha fraca", "Mínimo 6 caracteres.");
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

  // --- LÓGICA DO TEXTO DO BOTÃO ---
  const getSubmitLabel = () => {
    if (currentStep === 1) return "AVANÇAR";
    if (!selectedArchetype) return "FUNDAR QG";
    const role = selectedArchetype.value;
    if (['Rei', 'Rainha'].includes(role)) return "FUNDAR REINO";
    if (['Capitão', 'Capitã'].includes(role)) return "FUNDAR QG";
    return "FUNDAR BASE"; 
};

// --- SUBMISSÃO AO SUPABASE ---
  const handleCreateHQ = async () => {
    if (!birthDate || !selectedArchetype || !familyName || !captainName || !pin || !userMathAnswer) {
      return Alert.alert("Faltam dados!", "Preencha todo o formulário.");
    }
    
    if (!isAdult(birthDate)) {
        return Alert.alert("Acesso Restrito", "Para criar uma Família, é necessário ser maior de 18 anos.");
    }

    if (pin.length < 8) return Alert.alert("Segurança Fraca", "O PIN precisa ter exatamente 8 dígitos.");

    if (String(userMathAnswer).trim() !== String(mathChallenge.answer)) {
        generateMathChallenge(); 
        setUserMathAnswer('');
        return Alert.alert("Acesso Negado", "Resposta do desafio incorreta. Tente novamente.");
    }

    setLoading(true);

    try {
      // A. Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar conta.");
      const userId = authData.user.id;

      // B. Família
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .insert([{ name: familyName, created_by: userId }])
        .select().single();
      if (familyError) throw familyError;

      // C. Perfil
      const [day, month, year] = birthDate.split('/');
      const isoBirthDate = `${year}-${month}-${day}`; 

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
            user_id: userId,
            family_id: familyData.id,
            name: captainName,
            role: 'captain',
            gender: selectedArchetype.gender, 
            title_archetype: selectedArchetype.label, 
            pin: pin,
            birth_date: isoBirthDate,
            avatar: 'crown-placeholder'
        }]);
      if (profileError) throw profileError;

    } catch (error) {
      Alert.alert("Erro no QG", error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectArchetype = (item) => {
      setSelectedArchetype(item);
      setCaptainName(item.value); 
      setShowModal(false);
  };

  return (
    <ImageBackground 
        source={require('../../../assets/FamillyCreate.png')} 
        style={styles.container}
        resizeMode="cover"
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* PROGRESSO */}
            <View style={styles.progressContainer}>
                <Text style={styles.stepText}>PASSO {currentStep} DE {totalSteps}</Text>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: currentStep === 1 ? '50%' : '100%' }]} />
                </View>
            </View>

            {/* HEADER */}
            <View style={styles.headerContainer}>
                <View style={styles.avatarWrapper}>
                     <View style={styles.avatarShadow} />
                     <View style={styles.avatarFront}>
                        <MaterialCommunityIcons 
                            name={selectedArchetype ? selectedArchetype.icon : (currentStep === 1 ? "lock" : "account-question")} 
                            size={40} 
                            color={COLORS.primary} 
                        />
                     </View>
                </View>
                <View>
                    <Text style={styles.headerTitle}>{currentStep === 1 ? "Acesso" : "Identidade"}</Text>
                    <Text style={styles.headerSubtitle}>{currentStep === 1 ? "Credenciais" : "Segurança do Capitão"}</Text>
                </View>
            </View>

            {/* CARD */}
            <View style={styles.cardContainer}>
                <View style={styles.cardShadow} />
                <View style={styles.cardFront}>
                    
                    {/* --- PASSO 1 --- */}
                    {currentStep === 1 && (
                        <View>
                            <ToonInput 
                                label="EMAIL" icon="email-outline"
                                placeholder="ex: capitao@chonko.com"
                                value={email} onChangeText={setEmail}
                                keyboardType="email-address" autoCapitalize="none"
                            />
                            <ToonInput 
                                label="SENHA" icon="lock-outline"
                                placeholder="******" secureTextEntry
                                value={password} onChangeText={setPassword}
                            />
                        </View>
                    )}

                    {/* --- PASSO 2 --- */}
                    {currentStep === 2 && (
                        <View>
                             <ToonInput 
                                label="NOME DA TROPA (FAMÍLIA)" icon="account-group-outline"
                                placeholder="ex: Os Incríveis"
                                value={familyName} onChangeText={setFamilyName}
                            />
                            
                            <ToonInput 
                                label="DATA DE NASCIMENTO" icon="calendar-range"
                                placeholder="DD/MM/AAAA"
                                value={birthDate} onChangeText={handleDateChange}
                                keyboardType="numeric" maxLength={10}
                            />

                            {/* DROPDOWN BUTTON */}
                            <View style={{marginBottom: 15}}>
                                <Text style={styles.inputLabel}>QUEM ESTÁ NO COMANDO?</Text>
                                <TouchableOpacity 
                                    style={styles.dropdownButton} 
                                    onPress={() => setShowModal(true)}
                                    activeOpacity={0.8}
                                >
                                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                        <MaterialCommunityIcons 
                                            name={selectedArchetype ? selectedArchetype.icon : "account-search"} 
                                            size={24} color={COLORS.primary} style={{marginRight: 10}} 
                                        />
                                        <Text style={[styles.textInput, {color: selectedArchetype ? COLORS.primary : '#9CA3AF'}]}>
                                            {selectedArchetype ? selectedArchetype.label : "Selecione seu Título"}
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-down" size={24} color={COLORS.primary} />
                                </TouchableOpacity>
                            </View>

                            <ToonInput 
                                label="SUA PATENTE (NOME)" icon="badge-account-outline"
                                placeholder="ex: Capitão Silva"
                                value={captainName} onChangeText={setCaptainName}
                            />

                            {/* ÁREA DE SEGURANÇA */}
                            <View style={styles.securitySection}>
                                <Text style={styles.sectionTitle}>ÁREA DE SEGURANÇA</Text>
                                <View style={styles.divider} />
                                
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <View style={{ flex: 1 }}>
                                         <ToonInput 
                                            label={`QUANTO É ${mathChallenge.question}?`} icon="calculator"
                                            placeholder="?" keyboardType="numeric"
                                            value={userMathAnswer} onChangeText={setUserMathAnswer}
                                        />
                                    </View>
                                    <View style={{ width: 140 }}>
                                        <ToonInput 
                                            label="PIN (8 Dígitos)" icon="shield-lock"
                                            placeholder="12345678" keyboardType="numeric" maxLength={8} secureTextEntry
                                            value={pin} onChangeText={setPin}
                                        />
                                    </View>
                                </View>
                            </View>

                        </View>
                    )}

                    {/* --- 3. NAVEGAÇÃO ATUALIZADA (BOTÃO VOLTAR SEMPRE VISÍVEL) --- */}
                    <View style={styles.footerNavigation}>
                        
                        {/* Botão da Esquerda (Voltar) */}
                        <TouchableOpacity 
                            onPress={() => {
                                // Se estiver no Passo 1, volta para a tela anterior (Welcome)
                                if (currentStep === 1) {
                                    navigation.goBack();
                                } else {
                                    // Se estiver no Passo 2, volta para o Passo 1
                                    handlePrevStep();
                                }
                            }} 
                            style={styles.backButton}
                        >
                            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
                        </TouchableOpacity>

                        {/* Botão da Direita (Avançar/Fundar) */}
                        <TouchableOpacity 
                            style={styles.nextButton} activeOpacity={0.8} onPress={handleNextStep}
                        >
                            <View style={styles.buttonShadow} />
                            <View style={styles.buttonFront}>
                                {loading ? <ActivityIndicator color="#FFF" /> : (
                                    <>
                                        <Text style={styles.buttonText}>{getSubmitLabel()}</Text>
                                        <MaterialCommunityIcons name={currentStep === 1 ? "arrow-right" : "flag-variant"} size={24} color="#FFF" style={{ marginLeft: 8 }} />
                                    </>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
            <View style={{ height: 100 }} />
        </ScrollView>

        {/* --- MODAL --- */}
        <Modal
            visible={showModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowModal(false)}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity style={{flex:1}} onPress={() => setShowModal(false)} />
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>ESCOLHA SEU TÍTULO</Text>
                    <View style={styles.divider} />
                    <ScrollView style={{maxHeight: 300}}>
                        {ARCHETYPES.map((item, index) => (
                            <TouchableOpacity 
                                key={index} 
                                style={styles.modalItem}
                                onPress={() => selectArchetype(item)}
                            >
                                <View style={[styles.modalIconBox, {backgroundColor: COLORS.inputBg}]}>
                                    <MaterialCommunityIcons name={item.icon} size={24} color={COLORS.primary} />
                                </View>
                                <Text style={styles.modalItemText}>{item.label}</Text>
                                <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.primary} style={{opacity: 0.5}}/>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <TouchableOpacity style={styles.closeModalButton} onPress={() => setShowModal(false)}>
                        <Text style={styles.closeModalText}>CANCELAR</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 50 },
  
  // Progress
  progressContainer: { marginBottom: 30 },
  stepText: { fontFamily: 'RobotoCondensed_700Bold', color: COLORS.primary, fontSize: 12, marginBottom: 5, textAlign: 'right' },
  progressBarBg: { height: 12, backgroundColor: COLORS.white, borderRadius: 6, borderWidth: 2, borderColor: COLORS.primary, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.secondary, borderRadius: 4, borderRightWidth: 2, borderColor: COLORS.primary },

  // Header
  headerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingHorizontal: 5 },
  avatarWrapper: { width: 60, height: 60, marginRight: 15 },
  avatarShadow: { position: 'absolute', top: 3, left: 3, width: '100%', height: '100%', backgroundColor: COLORS.primary, borderRadius: 30 },
  avatarFront: { width: '100%', height: '100%', backgroundColor: COLORS.white, borderRadius: 30, borderWidth: 3, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontFamily: 'RobotoCondensed_700Bold', color: COLORS.primary },
  headerSubtitle: { fontSize: 14, fontFamily: 'RobotoCondensed_400Regular', color: COLORS.primary, opacity: 0.8 },

  // Card
  cardContainer: { position: 'relative', minHeight: 300, zIndex: 1 },
  cardShadow: { position: 'absolute', top: 8, left: 0, width: '100%', height: '100%', backgroundColor: COLORS.shadow, borderRadius: 24 },
  cardFront: { backgroundColor: COLORS.white, borderRadius: 24, padding: 20, borderWidth: 3, borderColor: COLORS.primary, justifyContent: 'space-between' },

  // Inputs
  inputLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 12, color: COLORS.primary, marginBottom: 4, marginLeft: 2 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary, borderRadius: 12, height: 50, backgroundColor: COLORS.inputBg },
  iconArea: { width: 45, height: '100%', justifyContent: 'center', alignItems: 'center', borderRightWidth: 2, borderRightColor: COLORS.primary, backgroundColor: 'rgba(255,255,255,0.3)' },
  textInput: { flex: 1, paddingHorizontal: 12, fontSize: 16, fontFamily: 'RobotoCondensed_700Bold', color: COLORS.primary },
  
  // Dropdown Button
  dropdownButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 2, borderColor: COLORS.primary, backgroundColor: COLORS.inputBg,
    borderRadius: 12, height: 50, paddingHorizontal: 15
  },

  // Security Section
  securitySection: { marginTop: 10, backgroundColor: COLORS.securityBg, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  sectionTitle: { fontSize: 12, fontFamily: 'RobotoCondensed_700Bold', textAlign: 'center', color: COLORS.primary },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(6, 78, 59, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: COLORS.white, borderRadius: 24, padding: 20, borderWidth: 3, borderColor: COLORS.primary, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 10 },
  modalTitle: { fontSize: 20, fontFamily: 'RobotoCondensed_700Bold', color: COLORS.primary, textAlign: 'center', marginBottom: 10 },
  divider: { height: 2, backgroundColor: '#E2E8F0', marginBottom: 10 },
  modalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalIconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  modalItemText: { flex: 1, fontSize: 18, fontFamily: 'RobotoCondensed_700Bold', color: COLORS.primary },
  closeModalButton: { marginTop: 15, padding: 15, backgroundColor: '#F1F5F9', borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#E2E8F0' },
  closeModalText: { fontFamily: 'RobotoCondensed_700Bold', color: COLORS.primary },

  // Navigation
  footerNavigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, zIndex: 0 },
  backButton: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary, borderRadius: 12, backgroundColor: '#F1F5F9' },
  nextButton: { flex: 1, height: 55, marginLeft: 15, position: 'relative' },
  buttonShadow: { position: 'absolute', top: 4, left: 0, right: 0, bottom: -4, borderRadius: 16, backgroundColor: COLORS.shadow },
  buttonFront: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderRadius: 16, borderWidth: 2, marginTop: -2, backgroundColor: COLORS.primary, borderColor: COLORS.shadow },
  buttonText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 18, color: '#FFF', letterSpacing: 0.5 }
});