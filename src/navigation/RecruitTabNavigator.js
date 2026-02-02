import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';

// Importando as telas da criança
import RecruitTasksScreen from '../screens/recruit/RecruitTasksScreen';
import RecruitShopScreen from '../screens/recruit/RecruitShopScreen';
import RecruitProfileScreen from '../screens/recruit/RecruitProfileScreen';

const Tab = createBottomTabNavigator();

export default function RecruitTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, // Esconde o cabeçalho padrão
        tabBarShowLabel: false, // Esconde os textos "Tarefas", "Loja" (fica só ícone)
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          elevation: 5,
          backgroundColor: '#ffffff',
          borderRadius: 25,
          height: 65,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: 5 },
        },
        // Configuração dos ícones ativos/inativos
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'TasksHome') {
            iconName = focused ? 'clipboard-list' : 'clipboard-list-outline';
          } else if (route.name === 'Shop') {
            iconName = focused ? 'store' : 'store-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account-circle' : 'account-circle-outline';
          }

          // Retorna o ícone com um círculo colorido se estiver ativo
          return (
            <View style={{
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: focused ? '#ecfdf5' : 'transparent', // Fundo verde claro se ativo
                width: 50, height: 50, borderRadius: 25
            }}>
                 <MaterialCommunityIcons name={iconName} size={28} color={focused ? '#059669' : '#9ca3af'} />
            </View>
         );
        },
      })}
    >
      <Tab.Screen name="TasksHome" component={RecruitTasksScreen} />
      <Tab.Screen name="Shop" component={RecruitShopScreen} />
      {/* Espaço para a futura tela */}
      <Tab.Screen name="Extra" component={RecruitShopScreen} options={{ tabBarIcon:({focused}) => <MaterialCommunityIcons name="star" size={24} color={focused ? '#059669' : '#9ca3af'}/> }}/>
      <Tab.Screen name="Profile" component={RecruitProfileScreen} />
    </Tab.Navigator>
  );
}