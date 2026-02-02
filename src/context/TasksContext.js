import { createContext, useContext, useState } from 'react';

const TasksContext = createContext({});

export function TasksProvider({ children }) {
  // === ESTADO 1: TAREFAS ===
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Boas vindas ao Chonko!', reward: 50, icon: 'party-popper', status: 'pending' }
  ]);

  // === ESTADO 2: DINHEIRO ===
  const [coins, setCoins] = useState(100);

  // === ESTADO 3: ITENS DA LOJA ===
  const [rewards, setRewards] = useState([
    { id: '1', title: '1h de Video Game', price: 50, icon: 'controller-classic' },
    { id: '2', title: 'Sorvete no FDS', price: 100, icon: 'ice-cream' },
  ]);

  // --- FUNÇÕES DE TAREFA ---
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

  // --- FUNÇÕES DA LOJA (NOVAS) ---
  
  // Adicionar item na loja
  function addReward(newReward) {
    setRewards(prev => [newReward, ...prev]);
  }

  // Remover item da loja
  function deleteReward(id) {
    setRewards(prev => prev.filter(r => r.id !== id));
  }

  // Comprar (Usado pelo Recruta)
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
        addReward, deleteReward, buyReward // <--- Exportando as novas funções
    }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  return useContext(TasksContext);
}