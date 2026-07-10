import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Dimensions, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View, ImageBackground, Image } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

// IMPORTANDO DO TEMA
import { FONTS } from '../../styles/theme';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
    const navigation = useNavigation();

    return (
        <ImageBackground
            source={require('../../../assets/Onboarding/WelcomeScreenBKG.png')} // Agora apenas o céu e a grama
            style={styles.container}
            resizeMode="cover"
        >
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* TOPO DINÂMICO: MASCOTE + TÍTULO + SUBTÍTULO */}
            <Animated.View entering={FadeInUp.duration(800)} style={styles.headerContainer}>

                {/* Ícone do Mascote */}
                <Image
                    source={require('../../../assets/icons/ChonkoIcon.png')}
                    style={styles.mascotIcon}
                    resizeMode="contain"
                />

                {/* Imagem do Título */}
                <Image
                    source={require('../../../assets/icons/ChonkoTitle.png')}
                    style={styles.titleImage}
                    resizeMode="contain"
                />

                {/* Frase de efeito com o "Chan" */}
                <View style={styles.subtitleWrapper}>
                    <MaterialCommunityIcons name="star-four-points" size={14} color="#F59E0B" style={styles.chanIconLeft} />
                    <Text style={styles.subtitle}>Transforme deveres em aventuras!</Text>
                    <MaterialCommunityIcons name="star-four-points" size={14} color="#F59E0B" style={styles.chanIconRight} />
                </View>

            </Animated.View>

            <View style={styles.contentContainer}>

                {/* TEXTO "EU VOU..." */}
                <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.questionWrapper}>
                    <Text style={styles.questionText}>Eu vou...</Text>
                </Animated.View>

                {/* OPÇÃO 1: CAPITÃO (CRIAR FAMÍLIA) */}
                <Animated.View entering={FadeInDown.delay(400).duration(600)} style={{ marginBottom: 20 }}>
                    <TouchableOpacity
                        style={styles.cardWrapper}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('CreateFamily')}
                    >
                        {/* Sombra Escura para dar peso 3D */}
                        <View style={[styles.cardShadow, { backgroundColor: '#D97706' }]} />

                        {/* Frente Sólida Laranja */}
                        <View style={[styles.cardFront, { backgroundColor: '#F59E0B' }]}>
                            <View style={[styles.iconCircle, { backgroundColor: '#FFF' }]}>
                                <MaterialCommunityIcons name="crown" size={32} color="#F59E0B" />
                            </View>

                            <View style={styles.cardTextContainer}>
                                <Text style={styles.cardTitle} numberOfLines={1}>Criar Família</Text>
                                <Text style={styles.cardDesc} numberOfLines={2}>Vou criar e gerenciar missões</Text>
                            </View>

                            {/* Círculo da Seta */}
                            <View style={styles.chevronCircle}>
                                <MaterialCommunityIcons name="chevron-right" size={24} color="#FFF" />
                            </View>
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                {/* OPÇÃO 2: RECRUTA (ENTRAR NA EQUIPE) */}
                <Animated.View entering={FadeInDown.delay(500).duration(600)}>
                    <TouchableOpacity
                        style={styles.cardWrapper}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('JoinFamily')}
                    >
                        {/* Sombra Escura para dar peso 3D */}
                        <View style={[styles.cardShadow, { backgroundColor: '#059669' }]} />

                        {/* Frente Sólida Verde */}
                        <View style={[styles.cardFront, { backgroundColor: '#10B981' }]}>
                            <View style={[styles.iconCircle, { backgroundColor: '#FFF' }]}>
                                <MaterialCommunityIcons name="rocket-launch" size={32} color="#10B981" />
                            </View>

                            <View style={styles.cardTextContainer}>
                                <Text style={styles.cardTitle} numberOfLines={1}>Entrar na Equipe</Text>
                                <Text style={styles.cardDesc} numberOfLines={2}>Vou cumprir missões e ganhar pontos</Text>
                            </View>

                            {/* Círculo da Seta */}
                            <View style={styles.chevronCircle}>
                                <MaterialCommunityIcons name="chevron-right" size={24} color="#FFF" />
                            </View>
                        </View>
                    </TouchableOpacity>
                </Animated.View>

            </View>

            {/* LOGIN FOOTER - BOTÃO PILULA AJUSTADO */}
            <Animated.View entering={FadeInDown.delay(700).duration(600)} style={styles.footer}>
                <TouchableOpacity
                    style={styles.ghostButton}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('Login')}
                >
                    <MaterialCommunityIcons name="account" size={22} color="#334155" />
                    <Text style={styles.ghostButtonText}>Já tenho uma conta</Text>
                    <MaterialCommunityIcons name="chevron-right" size={22} color="#334155" />
                </TouchableOpacity>
            </Animated.View>

        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FDFCF8',
    },

    // --- TOPO DINÂMICO ---
    headerContainer: {
        height: height * 0.44, // Garante um espaço fixo do topo para alinhar perfeitamente com os cartões
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 15,
        paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
    },
    mascotIcon: {
        width: width * 0.42, // Ocupa ~42% da largura da tela (ajuste se precisar maior/menor)
        height: height * 0.25,
        marginBottom: 0,
    },
    titleImage: {
        width: width * 0.70, // Ocupa ~75% da tela para ficar bem legível
        height: height * 0.10, // Altura proporcional
        marginTop: -30,
        marginBottom: -20,
    },

    subtitleWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    chanIconLeft: { marginRight: 6 },
    chanIconRight: { marginLeft: 6 },
    subtitle: {
        fontFamily: FONTS.bold,
        fontSize: 16,
        color: '#D97706',
        letterSpacing: 0.5,
        textAlign: 'center',
    },

    // --- CONTAINER CENTRAL ---
    contentContainer: {
        flex: 1,
        paddingHorizontal: 30,
        justifyContent: 'center',
    },

    questionWrapper: {
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    questionText: {
        marginTop: -50,
        marginBottom: 0,
        fontSize: 26,
        fontFamily: FONTS.bold,
        color: '#1E293B',
        letterSpacing: 0.5,
    },

    // --- CARDS ---
    cardWrapper: {
        position: 'relative',
        height: 105,
        width: '100%',
    },
    cardShadow: {
        position: 'absolute',
        top: 6,
        left: 0,
        width: '100%',
        height: '100%',
        borderRadius: 24,
    },
    cardFront: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderRadius: 24,
    },

    iconCircle: {
        width: 50,
        height: 50,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,

    },
    cardTextContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingRight: 10,
    },
    cardTitle: {
        fontSize: 20,
        fontFamily: FONTS.bold,
        color: '#FFF',
        marginBottom: 2,
        letterSpacing: 1.5
    },
    cardDesc: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 18
    },
    chevronCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.25)',
    },

    // --- FOOTER ---
    footer: {
        // Aumentado drasticamente o paddingBottom para tirar o botão de cima das flores
        paddingBottom: Platform.OS === 'ios' ? 90 : 70,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },

    // Botão Pílula Centralizado
    ghostButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: width * 0.70,
        paddingVertical: 16,
        borderRadius: 30,
        backgroundColor: '#FFF',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: .10,
        shadowRadius: 6,
        elevation: 2,

    },
    ghostButtonText: {
        color: '#334155',
        fontFamily: FONTS.bold,
        fontSize: 17,
        letterSpacing: 0.5,
        marginHorizontal: 10,
    },
});