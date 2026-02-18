import { StyleSheet, View } from 'react-native';
// Importação direta do arquivo
import ChonkoCoinsIcon from '../../../assets/icons/ChonkoCoins.svg';

export default function App() {
  return (
    <View style={styles.container}>
      {/* Você pode passar props como width e height */}
      <ChonkoCoinsIcon width="100%" height="100%" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});