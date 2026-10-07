import React from 'react';
import { 
  Sparkles, 
  Wrench, 
  Briefcase, 
  Factory, 
  ShieldCheck, 
  Truck, 
  Users, 
  Layers, 
  RotateCcw, 
  Package, 
  Paintbrush, 
  HardHat, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CustomSector } from '../types';

export const STANDARD_SECTORS = ['Liderança', 'Extrusão', 'Reciclagem', 'Fita'] as const;

export const SECTOR_PRESETS = [
  {
    name: 'Serviços Gerais',
    description: 'Limpeza, conservação, jardinagem e apoio operacional',
    icon: 'Sparkles',
    colorTheme: 'slate',
    shifts: ['Comercial', 'Diurno 1'],
    machines: ['Geral', 'Limpeza'],
    defaultCapacity: 2
  },
  {
    name: 'Manutenção',
    description: 'Manutenção mecânica, elétrica e predial',
    icon: 'Wrench',
    colorTheme: 'amber',
    shifts: ['Comercial', 'Diurno 1', 'Noturno 1'],
    machines: ['Geral', 'Mecânica', 'Elétrica'],
    defaultCapacity: 2
  },
  {
    name: 'Controle de Qualidade',
    description: 'Inspeção, ensaios técnicos e liberação de produto',
    icon: 'ShieldCheck',
    colorTheme: 'emerald',
    shifts: ['Comercial', 'Diurno 1'],
    machines: ['Geral', 'Laboratório'],
    defaultCapacity: 1
  },
  {
    name: 'Logística & Expedição',
    description: 'Carregamento, almoxarifado e movimentação de cargas',
    icon: 'Truck',
    colorTheme: 'blue',
    shifts: ['Comercial', 'Diurno 1'],
    machines: ['Geral', 'Expedição'],
    defaultCapacity: 2
  }
];

export const AVAILABLE_SECTOR_ICONS = [
  { id: 'Sparkles', label: 'Brilho / Limpeza', icon: Sparkles },
  { id: 'Briefcase', label: 'Pasta / Geral', icon: Briefcase },
  { id: 'Wrench', label: 'Ferramenta / Manut.', icon: Wrench },
  { id: 'ShieldCheck', label: 'Escudo / Qualidade', icon: ShieldCheck },
  { id: 'Truck', label: 'Caminhão / Logística', icon: Truck },
  { id: 'Package', label: 'Pacote / Estoque', icon: Package },
  { id: 'HardHat', label: 'Capacete / Obra', icon: HardHat },
  { id: 'Paintbrush', label: 'Pincel / Pintura', icon: Paintbrush },
  { id: 'Factory', label: 'Fábrica / Produção', icon: Factory },
  { id: 'Layers', label: 'Camadas / Processo', icon: Layers },
  { id: 'RotateCcw', label: 'Giro / Ciclo', icon: RotateCcw },
  { id: 'Users', label: 'Equipe / Pessoas', icon: Users }
];

export interface SectorThemeConfig {
  id: string;
  name: string;
  headerBg: string;
  headerBorder: string;
  cardBg: string;
  cardBorder: string;
  badgeBg: string;
  badgeText: string;
  iconBg: string;
  iconText: string;
  accentBtn: string;
  glowColor: string;
}

export const SECTOR_COLOR_THEMES: Record<string, SectorThemeConfig> = {
  slate: {
    id: 'slate',
    name: 'Ardósia / Escuro',
    headerBg: 'bg-slate-900/90',
    headerBorder: 'border-slate-700',
    cardBg: 'bg-[#1e293b]',
    cardBorder: 'border-slate-700',
    badgeBg: 'bg-slate-700/60',
    badgeText: 'text-slate-200',
    iconBg: 'bg-slate-800 text-slate-300 border border-slate-700',
    iconText: 'text-slate-300',
    accentBtn: 'bg-slate-700 hover:bg-slate-600 text-white shadow-slate-900/40',
    glowColor: 'from-slate-800 to-slate-950'
  },
  blue: {
    id: 'blue',
    name: 'Azul Real',
    headerBg: 'bg-[#172554]/95',
    headerBorder: 'border-blue-900/80',
    cardBg: 'bg-[#0f172a]',
    cardBorder: 'border-blue-900/60',
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-300',
    iconBg: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    iconText: 'text-blue-400',
    accentBtn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30',
    glowColor: 'from-blue-950 to-slate-950'
  },
  emerald: {
    id: 'emerald',
    name: 'Verde Esmeralda',
    headerBg: 'bg-[#064e3b]/95',
    headerBorder: 'border-emerald-900',
    cardBg: 'bg-[#022c22]',
    cardBorder: 'border-emerald-900/60',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
    iconBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    iconText: 'text-emerald-400',
    accentBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30',
    glowColor: 'from-emerald-950 to-slate-950'
  },
  amber: {
    id: 'amber',
    name: 'Âmbar / Dourado',
    headerBg: 'bg-[#78350f]/95',
    headerBorder: 'border-amber-900',
    cardBg: 'bg-[#451a03]',
    cardBorder: 'border-amber-900/60',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
    iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    iconText: 'text-amber-400',
    accentBtn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30',
    glowColor: 'from-amber-950 to-slate-950'
  },
  violet: {
    id: 'violet',
    name: 'Violeta / Roxo',
    headerBg: 'bg-[#4c1d95]/95',
    headerBorder: 'border-violet-900',
    cardBg: 'bg-[#2e1065]',
    cardBorder: 'border-violet-900/60',
    badgeBg: 'bg-violet-500/20',
    badgeText: 'text-violet-300',
    iconBg: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
    iconText: 'text-violet-400',
    accentBtn: 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-900/30',
    glowColor: 'from-violet-950 to-slate-950'
  },
  indigo: {
    id: 'indigo',
    name: 'Índigo Profundo',
    headerBg: 'bg-[#312e81]/95',
    headerBorder: 'border-indigo-900',
    cardBg: 'bg-[#1e1b4b]',
    cardBorder: 'border-indigo-900/60',
    badgeBg: 'bg-indigo-500/20',
    badgeText: 'text-indigo-300',
    iconBg: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
    iconText: 'text-indigo-400',
    accentBtn: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/30',
    glowColor: 'from-indigo-950 to-slate-950'
  },
  teal: {
    id: 'teal',
    name: 'Verde Petróleo / Teal',
    headerBg: 'bg-[#134e4a]/95',
    headerBorder: 'border-teal-900',
    cardBg: 'bg-[#042f2e]',
    cardBorder: 'border-teal-900/60',
    badgeBg: 'bg-teal-500/20',
    badgeText: 'text-teal-300',
    iconBg: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
    iconText: 'text-teal-400',
    accentBtn: 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-900/30',
    glowColor: 'from-teal-950 to-slate-950'
  },
  rose: {
    id: 'rose',
    name: 'Rosa / Carmesim',
    headerBg: 'bg-[#881337]/95',
    headerBorder: 'border-rose-900',
    cardBg: 'bg-[#4c0519]',
    cardBorder: 'border-rose-900/60',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-300',
    iconBg: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    iconText: 'text-rose-400',
    accentBtn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30',
    glowColor: 'from-rose-950 to-slate-950'
  }
};

export const renderSectorIcon = (iconName?: string, size = 24, className = '') => {
  const found = AVAILABLE_SECTOR_ICONS.find(i => i.id === iconName);
  const IconComp = found ? found.icon : Sparkles;
  return React.createElement(IconComp, { size, className });
};

const LOCAL_STORAGE_KEY = 'gestao_custom_sectors_v1';

export const getStoredCustomSectors = (): CustomSector[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Erro ao ler custom sectors do localStorage:', err);
    return [];
  }
};

export const persistCustomSectorsLocal = (sectors: CustomSector[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sectors));
  } catch (err) {
    console.error('Erro ao salvar custom sectors no localStorage:', err);
  }
};

export const saveCustomSectorToFirestore = async (sectorData: Partial<CustomSector>): Promise<CustomSector> => {
  const now = new Date().toISOString();
  const id = sectorData.id || `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  const shifts = (sectorData.shifts && sectorData.shifts.length > 0) 
    ? sectorData.shifts 
    : ['Comercial', 'Diurno 1'];
    
  const machines = (sectorData.machines && sectorData.machines.length > 0)
    ? sectorData.machines
    : ['Geral'];

  const cleanSector: CustomSector = {
    id,
    name: (sectorData.name || 'Novo Setor').trim(),
    description: (sectorData.description || '').trim(),
    icon: sectorData.icon || 'Sparkles',
    colorTheme: sectorData.colorTheme || 'slate',
    shifts,
    machines,
    defaultCapacity: Number(sectorData.defaultCapacity) || 1,
    createdAt: sectorData.createdAt || now,
    updatedAt: now
  };

  // Salva no Firestore
  try {
    await setDoc(doc(db, 'custom_sectors', id), cleanSector);
  } catch (err) {
    console.warn('Erro ao salvar no Firestore, salvando apenas local:', err);
  }

  // Atualiza cache local
  const current = getStoredCustomSectors();
  const index = current.findIndex(s => s.id === id);
  let updatedList: CustomSector[];
  if (index >= 0) {
    updatedList = [...current];
    updatedList[index] = cleanSector;
  } else {
    updatedList = [...current, cleanSector];
  }
  persistCustomSectorsLocal(updatedList);

  return cleanSector;
};

export const deleteCustomSectorFromFirestore = async (sectorId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'custom_sectors', sectorId));
  } catch (err) {
    console.warn('Erro ao deletar do Firestore:', err);
  }

  const current = getStoredCustomSectors();
  const updatedList = current.filter(s => s.id !== sectorId);
  persistCustomSectorsLocal(updatedList);
};
