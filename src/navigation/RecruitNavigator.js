import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Importe seus scripts (Vou refatorá-los abaixo, mas mantenha os nomes)
import RecruitProfileScreen from '../screens/recruit/RecruitProfileScreen';
import RecruitShopScreen from '../screens/recruit/RecruitShopScreen';
import RecruitTasksScreen from '../screens/recruit/RecruitTasksScreen';

const Tab = createBottomTabNavigator();

export default function RecruitNavigator({ route }) {
  // Passamos o profile recebido do Login para todas as abas
  const { profile } = route.params;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { 
            backgroundColor: '#fff', 
            borderTopWidth: 0, 
            elevation: 10, 
            height: 60, 
            paddingBottom: 10 
        },
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#9ca3af',
      }}
    >
      <Tab.Screen 
        name="Tasks" 
        component={RecruitTasksScreen} 
        initialParams={{ profile }} // Passa o perfil pra dentro
        options={{
          tabBarLabel: 'Missões',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={28} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Shop" 
        component={RecruitShopScreen} 
        initialParams={{ profile }}
        options={{
          tabBarLabel: 'Loja',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="store" size={28} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={RecruitProfileScreen} 
        initialParams={{ profile }}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-circle-outline" size={28} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}