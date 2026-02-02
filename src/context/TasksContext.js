import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';

const TasksContext = createContext({});

export function TasksProvider({ children }) {
  // === ESTADOS INICIAIS ===
  const [tasks, setTasks] = useState([]);
  const [coins, setCoins] = useState(0);
  const [rewards, setRewards] = useState([
    { id: '1', title: '1h de Video Game', price: 50, icon: 'controller-classic' },
    { id: '2', title: 'Sorvete no FDS', price: 100, icon: 'ice-cream' },
  ]);
  
  const [loading, setLoading] = useState(true);

  // === 1. CARREGAR DADOS (LOAD GAME) ===
  useEffect(() => {
    async function loadData() {
      try {
        const savedTasks = await AsyncStorage.getItem('@chonko:tasks');
        const savedCoins = await AsyncStorage.getItem('@chonko:coins');
        const savedRewards = await AsyncStorage.getItem('@chonko:rewards');

        if (savedTasks) setTasks(JSON.parse(savedTasks));
        
        if (savedCoins) setCoins(JSON.parse(savedCoins));
        else setCoins(100); // Saldo inicial para novos usuários

        if (savedRewards) setRewards(JSON.parse(savedRewards));

      } catch (error) {
        console.log('Erro ao carregar dados:', error);
      } finally { 
        // CORREÇÃO AQUI: Era 'final', o certo é 'finally'
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // === 2. SALVAR DADOS AUTOMATICAMENTE (AUTO-SAVE) ===
  useEffect(() => {
    if (!loading) {
      async function saveData() {
        try {
          await AsyncStorage.setItem('@chonko:tasks', JSON.stringify(tasks));
          await AsyncStorage.setItem('@chonko:coins', JSON.stringify(coins));
          await AsyncStorage.setItem('@chonko:rewards', JSON.stringify(rewards));
        } catch (error) {
          console.log('Erro ao salvar:', error);
        }
      }
      saveData();
    }
  }, [tasks, coins, rewards]); 

  // --- FUNÇÕES DE LÓGICA ---
  
  function addTask(newTask) {
    setTasks(prev => [newTask, ...prev]);
  }

  function completeTask(taskId) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'waiting_approval' } : t));
  }

  function approveTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== 'approved') {
        setCoins(prevCoins => prevCoins + task.reward);
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'approved' } : t));
    }
  }

  function rejectTask(taskId) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'pending' } : t));
  }

  function addReward(newReward) {
    setRewards(prev => [newReward, ...prev]);
  }

  function deleteReward(id) {
    setRewards(prev => prev.filter(r => r.id !== id));
  }

  function buyReward(reward) {
    if (coins >= reward.price) {
        setCoins(prev => prev - reward.price);
        return true; 
    } else {
        return false; 
    }
  }

  return (
    <TasksContext.Provider value={{ 
        tasks, coins, rewards, 
        addTask, completeTask, approveTask, rejectTask, 
        addReward, deleteReward, buyReward 
    }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  return useContext(TasksContext);
}