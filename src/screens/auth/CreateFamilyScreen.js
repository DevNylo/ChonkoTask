import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView,
    LayoutAnimation, Modal, Platform, ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity, View, StatusBar, ImageBackground
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

const PremiumInput = ({ label, icon, borderColor = '#E2E8F0', iconColor = '#F59E0B', containerStyle, ...props }) => (
    <View style={[{ marginBottom: 20 }, containerStyle]}>
        {/* adjustsFontSizeToFit e numberOfLines={1} impedem a quebra de linha */}
        <Text style={styles.inputLabel} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
        <View style={[styles.inputWrapper, { borderColor: borderColor }]}>
            <MaterialCommunityIcons name={icon} size={26} color={iconColor} style={{ marginLeft: 15 }} />
            <TextInput
                style={styles.textInput}
                placeholderTextColor="#94A3B8"
                cursorColor="#F59E0B"
                {...props}
            />
        </View>
    </View>
);

export default function CreateFamilyScreen() {
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

    const handleTopBack = () => {
        if (currentStep === 2) {
            handlePrevStep();
        } else {
            navigation.goBack();
        }
    };

    const getSubmitLabel = () => {
        if (currentStep === 1) return "CONTINUAR";
        if (!selectedArchetype) return "CRIAR CONTA";
        return "FINALIZAR CADASTRO";
    };

    // --- CÓDIGO RAIO-X PARA DEBUG DO SUPABASE ---
    const handleCreateHQ = async () => {
        if (!birthDate || !selectedArchetype || !familyName || !captainName || !pin || !userMathAnswer) {
            return Alert.alert("Faltam dados!", "Preencha todo o formulário.");
        }
        if (!isAdult(birthDate)) return Alert.alert("Acesso Restrito", "Necessário ser maior de 18 anos.");
        if (pin.length < 8) return Alert.alert("Segurança Fraca", "O PIN precisa ter exatamente 8 dígitos.");
        if (String(userMathAnswer).trim() !== String(mathChallenge.answer)) {
            generateMathChallenge(); setUserMathAnswer('');
            return Alert.alert("Ops!", "A resposta da conta matemática está incorreta. Tente novamente.");
        }

        setLoading(true);
        try {
            console.log("--- INICIANDO CRIAÇÃO DO QG ---");

            const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
            if (authError) throw authError;
            const userId = authData.user.id;
            console.log("1. Usuário Auth criado com sucesso:", userId);

            const { data: familyData, error: familyError } = await supabase
                .from('families').insert([{ name: familyName, created_by: userId }]).select().single();
            if (familyError) throw familyError;
            console.log("2. Família criada com sucesso:", familyData.id);

            const [day, month, year] = birthDate.split('/');
            const isoBirthDate = `${year}-${month}-${day}`;

            console.log("3. Tentando salvar o Perfil...");
            const { error: profileError } = await supabase.from('profiles').insert([{
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

            // SE DER ERRO NO PERFIL, ELE VAI GRITAR NO TERMINAL AQUI:
            if (profileError) {
                console.error("❌ ERRO FATAL AO CRIAR PERFIL:", profileError);
                throw profileError;
            }

            console.log("4. Perfil criado com sucesso!");

        } catch (error) {
            console.error("❌ ERRO GERAL CAPTURADO:", error);
            Alert.alert("Erro no QG", error.message || JSON.stringify(error));
        } finally {
            setLoading(false);
        }
    };

    const selectArchetype = (item) => {
        setSelectedArchetype(item); setCaptainName(item.value); setShowModal(false);
    };

    return (
        <ImageBackground
            source={require('../../../assets/Onboarding/CreateFamilyBKG.png')}
            style={styles.container}
            resizeMode="cover"
        >
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* BOTÃO SUPERIOR FIXO (Voltar / Sair) */}
            <TouchableOpacity style={styles.topBackBtn} onPress={handleTopBack} activeOpacity={0.7}>
                <MaterialCommunityIcons name="arrow-left" size={28} color="#D97706" />
            </TouchableOpacity>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                    {/* HEADER */}
                    <View style={styles.headerContainer}>
                        <View style={styles.iconCircle}>
                            <MaterialCommunityIcons
                                name={selectedArchetype ? selectedArchetype.icon : (currentStep === 1 ? "shield-lock" : "card-account-details-star")}
                                size={38} color="#D97706"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.headerTitle}>{currentStep === 1 ? "Criar Acesso" : "Perfil do Admin"}</Text>
                            <Text style={styles.headerSubtitle}>{currentStep === 1 ? "Seus dados de login" : "Configure sua identidade"}</Text>
                        </View>
                    </View>

                    {/* PROGRESSO (ESTILO BARRA DE XP) */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: currentStep === 1 ? '50%' : '100%' }]} />
                        </View>
                        <Text style={styles.stepText}>Etapa {currentStep} de {totalSteps}</Text>
                    </View>

                    {/* CARD COM SOMBRA SALTADA */}
                    <View style={styles.cardWrapper}>
                        <View style={styles.cardShadow} />

                        <View style={styles.cardFront}>

                            {currentStep === 1 && (
                                <View>
                                    <PremiumInput
                                        label="E-MAIL"
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
                                    <PremiumInput label="NOME DA FAMÍLIA/GRUPO" icon="account-group-outline" placeholder="Ex: Família Silva"
                                                  value={familyName} onChangeText={setFamilyName} />

                                    <PremiumInput label="DATA DE NASCIMENTO" icon="calendar-month-outline" placeholder="DD/MM/AAAA"
                                                  value={birthDate} onChangeText={handleDateChange} keyboardType="numeric" maxLength={10} />

                                    <View style={{marginBottom: 20}}>
                                        <Text style={styles.inputLabel}>SEU TÍTULO</Text>
                                        <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowModal(true)} activeOpacity={0.8}>
                                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                                <MaterialCommunityIcons name={selectedArchetype ? selectedArchetype.icon : "crown-outline"}
                                                                        size={26} color={selectedArchetype ? "#F59E0B" : "#94A3B8"} style={{marginRight: 12}} />
                                                <Text style={[styles.dropdownText, {color: selectedArchetype ? '#92400E' : '#94A3B8'}]}>
                                                    {selectedArchetype ? selectedArchetype.label : "Toque para escolher..."}
                                                </Text>
                                            </View>
                                            <View style={styles.chevronCircle}>
                                                <MaterialCommunityIcons name="chevron-down" size={24} color="#D97706" />
                                            </View>
                                        </TouchableOpacity>
                                    </View>

                                    <PremiumInput label="SEU NOME/APELIDO" icon="badge-account-outline" placeholder="Ex: Lima, Dani, etc."
                                                  value={captainName} onChangeText={setCaptainName} />

                                    {/* CAIXA DE SEGURANÇA */}
                                    <View style={styles.securityBox}>
                                        <View style={styles.securityHeader}>
                                            <MaterialCommunityIcons name="shield-check" size={24} color="#D97706" />
                                            <Text style={styles.securityTitle}>ZONA DE SEGURANÇA</Text>
                                        </View>
                                        <Text style={styles.securityDesc}>Isso evita que os aventureiros acessem suas configurações.</Text>

                                        {/* Adicionado alignItems: 'flex-end' para garantir que os inputs fiquem perfeitamente alinhados na base */}
                                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 10, alignItems: 'flex-end' }}>
                                            <View style={{ flex: 1 }}>
                                                <PremiumInput
                                                    label={`DESAFIO: ${mathChallenge.question}`}
                                                    icon="calculator" placeholder="?"
                                                    keyboardType="numeric" value={userMathAnswer} onChangeText={setUserMathAnswer}
                                                    borderColor="#FCD34D" iconColor="#D97706"
                                                    containerStyle={{ marginBottom: 0 }}
                                                />
                                            </View>
                                            <View style={{ width: 130 }}>
                                                <PremiumInput
                                                    label="SEU PIN (8)"
                                                    icon="dialpad" placeholder="••••••••"
                                                    keyboardType="numeric" maxLength={8} secureTextEntry value={pin} onChangeText={setPin}
                                                    borderColor="#FCD34D" iconColor="#D97706"
                                                    containerStyle={{ marginBottom: 0 }}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* BOTÕES DENTRO DO CARD */}
                            <View style={styles.footerNavigation}>
                                {currentStep === 2 && (
                                    <TouchableOpacity onPress={handlePrevStep} style={styles.backButton} activeOpacity={0.8}>
                                        <MaterialCommunityIcons name="arrow-left" size={28} color="#D97706" />
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity style={styles.nextButton} activeOpacity={0.8} onPress={handleNextStep}>
                                    <View style={styles.btnShadow} />
                                    <View style={styles.btnFront}>
                                        {loading ? <ActivityIndicator color="#FFF" /> : (
                                            <>
                                                <Text style={styles.buttonText} numberOfLines={1} adjustsFontSizeToFit>{getSubmitLabel()}</Text>
                                                <MaterialCommunityIcons name={currentStep === 1 ? "arrow-right" : "check-decagram"} size={24} color="#FFF" style={{ marginLeft: 8 }} />
                                            </>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <View style={{ height: 150 }} />
                </ScrollView>

                {/* MODAL CHONKO DE ARQUÉTIPOS */}
                <Modal visible={showModal} transparent={true} animationType="fade" onRequestClose={() => setShowModal(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity style={{flex:1, width: '100%'}} onPress={() => setShowModal(false)} />
                        <View style={styles.modalContent}>
                            <View style={styles.modalIconTop}>
                                <MaterialCommunityIcons name="crown" size={40} color="#F59E0B" />
                            </View>
                            <Text style={styles.modalTitle}>Escolha seu Título</Text>
                            <ScrollView style={{maxHeight: 350, width: '100%'}} showsVerticalScrollIndicator={false}>
                                <View style={{ paddingBottom: 10 }}>
                                    {ARCHETYPES.map((item, index) => (
                                        <TouchableOpacity key={index} style={styles.modalItem} activeOpacity={0.7} onPress={() => selectArchetype(item)}>
                                            <View style={styles.modalIconBox}>
                                                <MaterialCommunityIcons name={item.icon} size={26} color="#D97706" />
                                            </View>
                                            <Text style={styles.modalItemText}>{item.label}</Text>
                                            <View style={styles.modalItemChevron}>
                                                <MaterialCommunityIcons name="chevron-right" size={20} color="#F59E0B" />
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                            <TouchableOpacity style={styles.closeModalButton} activeOpacity={0.8} onPress={() => setShowModal(false)}>
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

    // Botão Superior Fixo de Voltar
    topBackBtn: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 50,
        left: 20,
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#FFFBEB',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FDE68A',
        zIndex: 20
    },

    scrollContent: { paddingHorizontal: 25, paddingTop: Platform.OS === 'ios' ? 120 : 110 },

    // Header
    headerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
    iconCircle: {
        width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFFBEB',
        justifyContent: 'center', alignItems: 'center', marginRight: 15,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    headerTitle: { fontSize: 28, fontFamily: FONTS.bold, color: '#92400E' },
    headerSubtitle: { fontSize: 15, fontFamily: FONTS.regular, color: '#D97706', opacity: 0.9, marginTop: 2 },

    // Progress (Barra XP)
    progressContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
    progressBarBg: {
        flex: 1, height: 20, backgroundColor: '#FEF3C7',
        borderRadius: 10, marginRight: 15,
        borderWidth: 1,
        borderColor: '#F59E0B', overflow: 'hidden'
    },
    progressBarFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 6 },
    stepText: { fontFamily: FONTS.bold, color: '#D97706', fontSize: 16 },

    // --- CARD COM SOMBRA SALTADA ---
    cardWrapper: {
        position: 'relative',
        marginBottom: 20
    },
    cardShadow: {
        position: 'absolute',
        top: 6,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(217, 119, 6, 0.15)',
        borderRadius: 24,
    },
    cardFront: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 25,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)'
    },

    // Inputs
    inputLabel: { fontFamily: FONTS.bold, fontSize: 13, color: '#92400E', marginBottom: 8, letterSpacing: 0.5, paddingLeft: 4 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 18,
        height: 60,
        borderWidth: 1,
    },
    textInput: { flex: 1, paddingHorizontal: 15, fontSize: 16, fontFamily: FONTS.bold, color: '#92400E' },

    dropdownButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#FFF', borderRadius: 18, height: 60, paddingLeft: 15, paddingRight: 8,
        borderWidth: 1, borderColor: '#E2E8F0'
    },
    dropdownText: { fontSize: 16, fontFamily: FONTS.bold },
    chevronCircle: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },

    // Security
    securityBox: { marginTop: 10, backgroundColor: '#FFFBEB', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#FCD34D' },
    securityHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 10 },
    securityTitle: { fontSize: 16, fontFamily: FONTS.bold, color: '#92400E', letterSpacing: 0.5 },
    securityDesc: { fontSize: 13, color: '#B45309', fontFamily: FONTS.regular, marginBottom: 15, lineHeight: 18 },

    // Footer Buttons
    footerNavigation: { flexDirection: 'row', alignItems: 'center', marginTop: 15, gap: 15 },

    backButton: {
        width: 65, height: 65, justifyContent: 'center', alignItems: 'center',
        borderRadius: 20, backgroundColor: '#FFFBEB',
        borderWidth: 1, borderColor: '#FDE68A'
    },

    // Botão Next
    nextButton: { flex: 1, height: 65, position: 'relative' },
    btnShadow: { position: 'absolute', top: 6, left: 0, width: '100%', height: '100%', backgroundColor: '#D97706', borderRadius: 20 },
    btnFront: {
        width: '100%', height: '100%', backgroundColor: '#F59E0B',
        borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)'
    },
    buttonText: { fontFamily: FONTS.bold, fontSize: 15, color: '#FFF', letterSpacing: 0.5 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'flex-end', alignItems: 'center' },
    modalContent: {
        width: '100%', backgroundColor: '#FFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, alignItems: 'center',
        borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#FDE68A',
        paddingBottom: Platform.OS === 'ios' ? 40 : 30
    },
    modalIconTop: {
        width: 70, height: 70, backgroundColor: '#FEF3C7', borderRadius: 35,
        justifyContent: 'center', alignItems: 'center', marginBottom: 15,
        borderWidth: 1, borderColor: '#FCD34D', marginTop: -65
    },
    modalTitle: { fontSize: 24, fontFamily: FONTS.bold, color: '#92400E', textAlign: 'center', marginBottom: 25 },

    modalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, marginBottom: 10, backgroundColor: '#F8FAFC', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
    modalIconBox: {
        width: 46, height: 46, borderRadius: 16, backgroundColor: '#FEF3C7',
        justifyContent: 'center', alignItems: 'center', marginRight: 15,
    },
    modalItemText: { flex: 1, fontSize: 17, fontFamily: FONTS.bold, color: '#92400E' },
    modalItemChevron: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },

    closeModalButton: { marginTop: 15, width: '100%', height: 60, backgroundColor: '#F1F5F9', borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    closeModalText: { fontFamily: FONTS.bold, color: '#64748B', fontSize: 16, letterSpacing: 1 },
});