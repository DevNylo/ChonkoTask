// src/styles/theme.js

export const COLORS = {
  // --- IDENTIDADE PRINCIPAL (VERDE CHONKO) ---
  primary: '#064E3B',    // Verde Escuro (Bordas, Textos Fortes, Outline)
  secondary: '#10B981',  // Verde Vibrante (Botões, Detalhes, Fundo padrão)
  accent: '#34D399',     // Verde Claro (Acentos)
  background: '#10B981', // Cor de fundo de fallback
  
  // --- UI ELEMENTS ---
  surface: '#FFFFFF',    // Cards, Modals, Fundos de input
  surfaceAlt: 'rgba(6, 78, 59, 0.05)', // Fundo de Input cinza/verde claro
  securityBg: '#F0FDF4', // Fundo da área de segurança (Register)
  
  // --- TEXTOS ---
  textPrimary: '#064E3B', // Texto principal (igual ao primary)
  textSecondary: '#10B981', // Texto de destaque
  placeholder: '#9CA3AF', // Cinza para placeholders
  
  // --- FEEDBACK & STATUS ---
  error: '#EF4444',       // Vermelho (Logout, Erros)
  success: '#10B981',
  
  // --- EFEITOS VISUAIS ---
  shadow: '#166534',      // Sombra Unificada (Verde Escuro Suave)
  overlay: 'rgba(255,255,255,0.90)', // Overlay padrão (RoleSelection)
  modalOverlay: 'rgba(6, 78, 59, 0.8)', // Fundo escuro atrás de modais
  
  // --- PAPÉIS (ROLES) ---
  gold: '#F59E0B',        // Admin/Capitão (Coroa)
  blue: '#3B82F6',        // Azul (Destaque Capitão na Welcome)
  recruit: '#064E3B'      // Recruta (Geralmente igual ao primary)
};

export const FONTS = {
  bold: 'RobotoCondensed_700Bold',
  regular: 'RobotoCondensed_400Regular',
};