import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient'; // Importante para o visual premium
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { FONTS } from '../../styles/theme';

const { width } = Dimensions.get('window');
// Ajuste para mostrar um voucher grande e bonito
const CARD_WIDTH = width - 40; 

// --- COMPONENTE: EFEITO DE BRILHO (SHIMMER) ---
const ShinyOverlay = () => {
    const translateX = useRef(new Animated.Value(-CARD_WIDTH)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(translateX, {
                    toValue: CARD_WIDTH,
                    duration: 1500,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.delay(2000) // Espera um pouco antes de brilhar de novo
            ])
        ).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.shimmerOverlay,
                {
                    transform: [{ translateX }],
                },
            ]}
        >
            <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
            />
        </Animated.View>
    );
};

export default function BagScreen({ route }) {
    const { profile } = route.params || {};
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchInventory();
        }, [])
    );

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('inventory_items')
                .select(`*, rewards (title, icon, description, cost)`)
                .eq('profile_id', profile.id)
                .neq('status', 'DELIVERED')
                .order('purchased_at', { ascending: false });

            if (error) throw error;
            setInventory(data || []);
        } catch (error) {
            console.log("Erro inventory:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUseItem = (item) => {
        Alert.alert(
            "💎 Resgatar Voucher",
            `Deseja gastar seu voucher de "${item.rewards.title}" agora?`,
            [
                { text: "Guardar", style: "cancel" },
                { 
                    text: "USAR AGORA!", 
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('inventory_items')
                                .update({ status: 'PENDING_DELIVERY', used_at: new Date() })
                                .eq('id', item.id);
                            if (error) throw error;
                            fetchInventory(); 
                        } catch (e) { Alert.alert("Erro", "Falha ao usar."); }
                    }
                }
            ]
        );
    };

    const renderVoucher = ({ item }) => {
        const isPending = item.status === 'PENDING_DELIVERY';
        // Determina a raridade/cor baseada no custo original (opcional, ou usa cores fixas)
        const isGold = item.rewards.cost >= 500; 
        
        // Cores do Card
        const gradientColors = isPending 
            ? ['#E2E8F0', '#94A3B8'] // Cinza se pendente
            : isGold 
                ? ['#FCD34D', '#B45309'] // Ouro se caro
                : ['#818CF8', '#4338CA']; // Roxo/Azul se comum

        const iconColor = isPending ? '#64748B' : (isGold ? '#78350F' : '#FFF');
        const textColor = isPending ? '#64748B' : (isGold ? '#78350F' : '#FFF');

        return (
            <View style={styles.voucherContainer}>
                {/* Sombra Glow atrás do card */}
                {!isPending && <View style={[styles.glowShadow, { backgroundColor: gradientColors[0] }]} />}

                <View style={styles.ticketShape}>
                    <LinearGradient
                        colors={gradientColors}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                        style={styles.ticketGradient}
                    >
                        {/* Efeito de Brilho apenas se não estiver pendente */}
                        {!isPending && <ShinyOverlay />}

                        {/* --- Conteúdo Esquerdo (Ícone) --- */}
                        <View style={styles.leftSection}>
                            <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                <MaterialCommunityIcons name={item.rewards.icon} size={32} color={iconColor} />
                            </View>
                        </View>

                        {/* Linha pontilhada divisória */}
                        <View style={styles.dividerContainer}>
                            <View style={styles.circleCutoutTop} />
                            <View style={styles.dashedLine} />
                            <View style={styles.circleCutoutBottom} />
                        </View>

                        {/* --- Conteúdo Direito (Info e Botão) --- */}
                        <View style={styles.rightSection}>
                            <View>
                                <Text style={[styles.voucherLabel, { color: textColor, opacity: 0.8 }]}>
                                    VOUCHER VÁLIDO
                                </Text>
                                <Text style={[styles.voucherTitle, { color: textColor }]} numberOfLines={2}>
                                    {item.rewards.title}
                                </Text>
                            </View>

                            <TouchableOpacity 
                                style={[
                                    styles.actionButton, 
                                    { backgroundColor: isPending ? 'transparent' : 'rgba(0,0,0,0.2)' }
                                ]}
                                disabled={isPending}
                                onPress={() => handleUseItem(item)}
                            >
                                <Text style={[styles.actionText, { color: textColor }]}>
                                    {isPending ? "AGUARDANDO..." : "RESGATAR"}
                                </Text>
                                {!isPending && <MaterialCommunityIcons name="ticket-confirmation" size={16} color={textColor} style={{marginLeft: 5}} />}
                            </TouchableOpacity>
                        </View>

                        {/* CARIMBO DE PENDENTE */}
                        {isPending && (
                            <View style={styles.stampContainer}>
                                <Text style={styles.stampText}>EM TRÂNSITO</Text>
                            </View>
                        )}
                    </LinearGradient>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Fundo Mágico */}
            <LinearGradient
                colors={['#1E1B4B', '#312E81', '#4C1D95']}
                style={StyleSheet.absoluteFill}
            />
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTitleContainer}>
                    <MaterialCommunityIcons name="wallet-giftcard" size={28} color="#FCD34D" />
                    <Text style={styles.headerTitle}>Minha Coleção</Text>
                </View>
                <Text style={styles.headerSubtitle}>
                    {inventory.length} {inventory.length === 1 ? 'Voucher' : 'Vouchers'} guardados
                </Text>
            </View>

            {loading ? (
                <View style={styles.centerLoading}>
                    <ActivityIndicator size="large" color="#FCD34D" />
                    <Text style={styles.loadingText}>Abrindo o cofre...</Text>
                </View>
            ) : (
                <FlatList
                    data={inventory}
                    keyExtractor={item => item.id}
                    renderItem={renderVoucher}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="safe" size={80} color="rgba(255,255,255,0.2)" />
                            <Text style={styles.emptyText}>Seu cofre está vazio!</Text>
                            <Text style={styles.emptySubText}>Visite a loja para conseguir Vouchers.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)'
    },
    headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerTitle: { fontSize: 28, fontFamily: FONTS.bold, color: '#FFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 4 },
    headerSubtitle: { fontSize: 14, color: '#C7D2FE', marginTop: 5, marginLeft: 38 },

    centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#FFF', marginTop: 10, fontFamily: FONTS.medium },

    listContent: { padding: 20, paddingBottom: 100 },

    // --- ESTILOS DO VOUCHER ---
    voucherContainer: {
        marginBottom: 20,
        alignItems: 'center',
    },
    glowShadow: {
        position: 'absolute',
        width: CARD_WIDTH - 10,
        height: 100,
        borderRadius: 20,
        top: 10,
        opacity: 0.6,
        shadowColor: '#FFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10
    },
    ticketShape: {
        width: CARD_WIDTH,
        height: 120,
        borderRadius: 16,
        overflow: 'hidden', // Importante para o shimmer não vazar
    },
    ticketGradient: {
        flex: 1,
        flexDirection: 'row',
        padding: 0,
    },
    
    // Esquerda
    leftSection: {
        width: 90,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)', // Sutil escurecimento
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },

    // Divisória do Ticket
    dividerContainer: {
        width: 20,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden', // Esconde a linha onde estão os círculos
        position: 'relative',
    },
    dashedLine: {
        height: '70%',
        width: 2,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        borderStyle: 'dashed',
        borderRadius: 1
    },
    circleCutoutTop: {
        position: 'absolute',
        top: -10,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#27246D', // Mesma cor do fundo da tela (aproximado) ou transparente se usar mask
        // Truque: Como o fundo é gradiente, idealmente usariamos MaskedView, 
        // mas para simplificar, usaremos a cor média do fundo da tela.
        // Se ficar feio, mude para a cor exata do fundo atrás do card.
    },
    circleCutoutBottom: {
        position: 'absolute',
        bottom: -10,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#3E2F86', // Mesma cor do fundo da tela
    },

    // Direita
    rightSection: {
        flex: 1,
        padding: 15,
        justifyContent: 'space-between',
    },
    voucherLabel: { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 1, marginBottom: 2 },
    voucherTitle: { fontSize: 18, fontFamily: FONTS.bold, textTransform: 'uppercase' },
    
    actionButton: {
        flexDirection: 'row',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center'
    },
    actionText: { fontSize: 12, fontFamily: FONTS.bold },

    // Efeitos Especiais
    shimmerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: 100,
        zIndex: 10,
        transform: [{ skewX: '-20deg' }]
    },
    stampContainer: {
        position: 'absolute',
        right: 20,
        top: 35,
        borderWidth: 2,
        borderColor: 'rgba(0,0,0,0.4)',
        padding: 5,
        borderRadius: 5,
        transform: [{ rotate: '-15deg' }],
        backgroundColor: 'rgba(255,255,255,0.1)'
    },
    stampText: {
        color: 'rgba(0,0,0,0.5)',
        fontFamily: FONTS.bold,
        fontSize: 12,
        textTransform: 'uppercase'
    },

    emptyState: { alignItems: 'center', marginTop: 100, opacity: 0.8 },
    emptyText: { color: '#FFF', fontSize: 20, fontFamily: FONTS.bold, marginTop: 20 },
    emptySubText: { color: '#C7D2FE', fontSize: 14, marginTop: 5 },
});