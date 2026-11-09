export interface TagColorPreset {
  id: string;
  name: string;
  start: string;
  end: string;
  text: string;
}

export const TAG_COLOR_PRESETS: TagColorPreset[] = [
  { id: 'orange', name: 'Laranja Fogo (Padrão)', start: '#FF4500', end: '#FFA000', text: '#FFFFFF' },
  { id: 'red', name: 'Vermelho Rubi', start: '#DC2626', end: '#F43F5E', text: '#FFFFFF' },
  { id: 'rose', name: 'Rosa Pink', start: '#EC4899', end: '#DB2777', text: '#FFFFFF' },
  { id: 'purple', name: 'Roxo & Violeta', start: '#7C3AED', end: '#A855F7', text: '#FFFFFF' },
  { id: 'blue', name: 'Azul Elétrico', start: '#0284C7', end: '#38BDF8', text: '#FFFFFF' },
  { id: 'emerald', name: 'Verde Esmeralda', start: '#059669', end: '#10B981', text: '#FFFFFF' },
  { id: 'amber', name: 'Âmbar / Dourado', start: '#D97706', end: '#F59E0B', text: '#FFFFFF' },
  { id: 'dark', name: 'Preto & Dourado', start: '#18181B', end: '#D97706', text: '#FEF3C7' },
];

export const SALDAO_COLOR_PRESETS = TAG_COLOR_PRESETS;
