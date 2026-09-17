import { DowntimeKeyword } from '../types';

export const DOWNTIME_KEYWORDS_PRESETS: DowntimeKeyword[] = [
  // Mecânica & Componentes Principais
  { id: '1', keyword: 'eixo', isPopular: true, category: 'Mecânica' },
  { id: '2', keyword: 'biela central', isPopular: true, category: 'Mecânica' },
  { id: '3', keyword: 'mangueira de ar', isPopular: true, category: 'Pneumática' },
  { id: '4', keyword: 'bomba hidraulica', isPopular: true, category: 'Hidráulica' },
  { id: '5', keyword: 'refile', isPopular: true, category: 'Processo' },
  { id: '6', keyword: 'motor principal', isPopular: true, category: 'Elétrica' },
  { id: '7', keyword: 'rolamento', isPopular: true, category: 'Mecânica' },
  { id: '8', keyword: 'faca de corte', isPopular: true, category: 'Ferramental' },
  { id: '9', keyword: 'troca de filtro', isPopular: true, category: 'Processo' },
  { id: '10', keyword: 'ajuste de matriz', isPopular: true, category: 'Processo' },

  // Elétrica & Sensores
  { id: '11', keyword: 'resistência elétrica', category: 'Elétrica' },
  { id: '12', keyword: 'inversor de frequência', category: 'Elétrica' },
  { id: '13', keyword: 'sensor de temperatura', category: 'Elétrica' },
  { id: '14', keyword: 'painel elétrico', category: 'Elétrica' },
  { id: '15', keyword: 'valvula solenoide', category: 'Pneumática' },
  { id: '16', keyword: 'pressão pneumática', category: 'Pneumática' },

  // Operacional & Insumos
  { id: '17', keyword: 'falta de matéria-prima', isPopular: true, category: 'Operacional' },
  { id: '18', keyword: 'troca de bobina', category: 'Operacional' },
  { id: '19', keyword: 'alinhamento de filme', category: 'Processo' },
  { id: '20', keyword: 'limpeza de cabeçote', category: 'Processo' },
  { id: '21', keyword: 'limpeza de calandra', category: 'Processo' },
  { id: '22', keyword: 'pneu do puxador', category: 'Mecânica' },
  { id: '23', keyword: 'esteira', category: 'Mecânica' },
  { id: '24', keyword: 'ventoinha de refrigeração', category: 'Refrigeração' },
  { id: '25', keyword: 'setup de máquina', isPopular: true, category: 'Operacional' },
  { id: '26', keyword: 'quebra de filme', isPopular: true, category: 'Processo' },
  { id: '27', keyword: 'vazamento de óleo', category: 'Hidráulica' },
  { id: '28', keyword: 'falta de energia', category: 'Utilidades' },
  { id: '29', keyword: 'refeição / ginástica', category: 'Operacional' },
  { id: '30', keyword: 'troca de tela', isPopular: true, category: 'Processo' },
];

export function searchKeywords(query: string, presets: DowntimeKeyword[] = DOWNTIME_KEYWORDS_PRESETS): DowntimeKeyword[] {
  if (!query || !query.trim()) {
    return presets;
  }
  const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return presets.filter(item => {
    const normalizedKeyword = item.keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normalizedCategory = (item.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalizedKeyword.includes(normalizedQuery) || normalizedCategory.includes(normalizedQuery);
  });
}
