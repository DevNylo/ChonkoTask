import { ActivityIndicator, View } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

// 1. Importar o hook e os pesos da fonte que vamos usar
import {
  RobotoCondensed_400Regular,
  RobotoCondensed_700Bold,
  useFonts
} from '@expo-google-fonts/roboto-condensed';

export default function App() {
  // 2. Carregar as fontes na memória
  // O hook retorna um booleano [fontsLoaded] que fica true quando acaba
  let [fontsLoaded] = useFonts({
    RobotoCondensed_400Regular,
    RobotoCondensed_700Bold,
  });

  // 3. Trava de Segurança (Crítico)
  // Se tentarmos renderizar o AppNavigator antes da fonte carregar, o app fecha sozinho (crash).
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#047857" />
      </View>
    );
  }

  // 4. Agora é seguro renderizar o app
  return (
    <AuthProvider>
       <AppNavigator />
    </AuthProvider>
  );
}