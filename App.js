import 'react-native-gesture-handler';
// Importa o Navegador
import AppNavigator from './src/navigation/AppNavigator';
// Importa o Provedor de Tarefas
import { TasksProvider } from './src/context/TasksContext';

export default function App() {
  return (
    // O Provider precisa envolver o Navigator para funcionar
    <TasksProvider>
      <AppNavigator />
    </TasksProvider>
  );
}