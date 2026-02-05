import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function RecruitShopScreen({ route }) {
  const { profile } = route.params;
  
  const [rewards, setRewards] = useState([]);
  const [balance, setBalance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchShopData();
    }, [])
  );

  const fetchShopData = async () => {
    try {
      // 1. Buscar Recompensas da Família
      const { data: rewardsData } = await supabase
        .from('rewards')
        .select('*')
        .eq('family_id', profile.family_id);

      // 2. Buscar Saldo Atual
      const { data: profileData } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', profile.id)
        .single();

      if (rewardsData) setRewards(rewardsData);
      if (profileData) setBalance(profileData.balance);
    } catch (error) {
      console.log(error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleBuy = (item) => {
    if (balance < item.price) {
      Alert.alert("Saldo Insuficiente 😢", "Complete mais missões para ganhar moedas.");
      return;
    }

    Alert.alert(
      "Comprar Recompensa",
      `Deseja gastar ${item.price} moedas em "${item.title}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "COMPRAR!", 
          onPress: async () => {
            try {
                // 1. Criar registro de compra
                const { error: buyError } = await supabase
                    .from('reward_redemptions')
                    .insert([{
                        reward_id: item.id,
                        profile_id: profile.id,
                        cost: item.price,
                        status: 'pending' // Capitão precisa entregar
                    }]);
                
                if (buyError) throw buyError;

                // 2. Descontar moedas do perfil
                const newBalance = balance - item.price;
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ balance: newBalance })
                    .eq('id', profile.id);

                if (updateError) throw updateError;

                setBalance(newBalance); // Atualiza na hora
                Alert.alert("Sucesso! 🎉", "Mostre ao Capitão para resgatar seu prêmio!");

            } catch (error) {
                Alert.alert("Erro", "Falha na compra.");
            }
          }
        }
      ]
    );
  };

  const renderShopItem = ({ item }) => {
    const canAfford = balance >= item.price;

    return (
        <TouchableOpacity 
            style={[styles.card, !canAfford && styles.disabledCard]} 
            onPress={() => handleBuy(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, canAfford ? styles.iconGreen : styles.iconGray]}>
                <MaterialCommunityIcons name={item.icon || 'gift'} size={32} color="#fff" />
            </View>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={[styles.itemPrice, !canAfford && styles.priceRed]}>
                💰 {item.price}
            </Text>
        </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#059669', '#34d399']} style={styles.headerBackground} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lojinha</Text>
        <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Seu Saldo:</Text>
            <View style={styles.coinRow}>
                <MaterialCommunityIcons name="sack" size={24} color="#fbbf24" />
                <Text style={styles.balanceValue}>{balance}</Text>
            </View>
        </View>
      </View>

      <View style={styles.body}>
        <FlatList
            data={rewards}
            keyExtractor={item => item.id}
            renderItem={renderShopItem}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchShopData()}} />}
            ListEmptyComponent={
                <View style={{alignItems:'center', marginTop: 50}}>
                    <Text style={{color:'#666'}}>A loja está vazia. Peça ao Capitão para adicionar itens!</Text>
                </View>
            }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  headerBackground: { height: 150, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, position: 'absolute', top: 0, left: 0, right: 0 },
  header: { marginTop: 50, paddingHorizontal: 20, marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 15 },
  balanceContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center',
    paddingVertical: 10, paddingHorizontal: 25, borderRadius: 20, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
  },
  balanceLabel: { color: '#e0f2fe', fontSize: 12, fontWeight: '600' },
  coinRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  balanceValue: { color: '#fbbf24', fontSize: 24, fontWeight: 'bold', marginLeft: 8 },
  body: { flex: 1, paddingHorizontal: 15, paddingTop: 10 },
  row: { justifyContent: 'space-between' },
  card: {
    backgroundColor: '#fff', width: '48%', borderRadius: 20, padding: 15, marginBottom: 15,
    alignItems: 'center', elevation: 3
  },
  disabledCard: { opacity: 0.6 },
  iconContainer: {
    width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 10
  },
  iconGreen: { backgroundColor: '#10b981' },
  iconGray: { backgroundColor: '#9ca3af' },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', textAlign: 'center', height: 40 },
  itemPrice: { fontSize: 16, fontWeight: 'bold', color: '#059669', marginTop: 5 },
  priceRed: { color: '#ef4444' }
});