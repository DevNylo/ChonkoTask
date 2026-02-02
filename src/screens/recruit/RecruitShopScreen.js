import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTasks } from '../../context/TasksContext';

export default function RecruitShopScreen() {
  const { coins, rewards, buyReward } = useTasks();

  const handleBuy = (item) => {
    Alert.alert(
        "Comprar Recompensa",
        `Deseja gastar ${item.price} moedas em "${item.title}"?`,
        [
            { text: "Cancelar", style: "cancel" },
            { 
                text: "COMPRAR!", 
                onPress: () => {
                    const success = buyReward(item);
                    if (success) {
                        Alert.alert("Sucesso! 🎉", "Mostre isso ao Capitão para resgatar!");
                    } else {
                        Alert.alert("Saldo Insuficiente 😢", "Complete mais missões para ganhar moedas.");
                    }
                }
            }
        ]
    );
  };

  const renderShopItem = ({ item }) => {
    const canAfford = coins >= item.price;

    return (
        <TouchableOpacity 
            style={[styles.card, !canAfford && styles.disabledCard]} 
            onPress={() => handleBuy(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, canAfford ? styles.iconGreen : styles.iconGray]}>
                <MaterialCommunityIcons name={item.icon} size={32} color="#fff" />
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
      
      {/* HEADER DE SALDO */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lojinha</Text>
        <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Seu Saldo:</Text>
            <View style={styles.coinRow}>
                <MaterialCommunityIcons name="sack" size={24} color="#fbbf24" />
                <Text style={styles.balanceValue}>{coins}</Text>
            </View>
        </View>
      </View>

      {/* GRID DE ITENS */}
      <View style={styles.body}>
        <FlatList
            data={rewards}
            keyExtractor={item => item.id}
            renderItem={renderShopItem}
            numColumns={2} // Grid de 2 colunas
            columnWrapperStyle={styles.row}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    paddingVertical: 10, paddingHorizontal: 25,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
  },
  balanceLabel: { color: '#e0f2fe', fontSize: 12, fontWeight: '600' },
  coinRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  balanceValue: { color: '#fbbf24', fontSize: 24, fontWeight: 'bold', marginLeft: 8 },

  body: { flex: 1, paddingHorizontal: 15, paddingTop: 10 },
  row: { justifyContent: 'space-between' },

  // CARD DO ITEM
  card: {
    backgroundColor: '#fff',
    width: '48%', // Quase metade da tela
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: {width:0, height:2}
  },
  disabledCard: { opacity: 0.6 },
  
  iconContainer: {
    width: 60, height: 60,
    borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10
  },
  iconGreen: { backgroundColor: '#10b981' },
  iconGray: { backgroundColor: '#9ca3af' },

  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', textAlign: 'center', height: 40 },
  itemPrice: { fontSize: 16, fontWeight: 'bold', color: '#059669', marginTop: 5 },
  priceRed: { color: '#ef4444' }
});