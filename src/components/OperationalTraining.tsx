import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, Award, Users, BookOpen, Clock, FileText, CheckCircle2, AlertCircle, 
  PlayCircle, Plus, Trash2, Edit2, CheckSquare, Square, ChevronRight, ChevronLeft, 
  CalendarRange, Filter, BarChart, Info, Search, HelpCircle, Save, ArrowLeft, 
  Loader2, ListTodo, GraduationCap, Scale, Printer, Check, ChevronDown, Maximize2, Minimize2
} from 'lucide-react';
import { Employee, OperatorTrainingSheet, OperatorTrainingModule } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { motion, AnimatePresence } from 'motion/react';

interface OperationalTrainingProps {
  employees: Employee[];
  sheets: OperatorTrainingSheet[];
  onSaveSheet: (sheet: Partial<OperatorTrainingSheet>) => Promise<void>;
  onDeleteSheet: (id: string) => void;
  onClose: () => void;
  canManage: boolean;
  isReadOnly?: boolean;
  onBlockedAction?: (title?: string, message?: string) => void;
}

// 9 Modules of the operational training plan from the attached PDF
const OPERATIONAL_TOPICS = [
  {
    id: 'm1',
    title: 'Módulo 1: Leitura de OP e Setup Inicial',
    focus: 'Entendimento do "mapa de trabalho" e preparação da máquina antes do início do processo.',
    technicalContent: [
      { id: 'm1_1', text: 'Interpretação Completa da OP: Identificação do cliente, criticidade da entrega (ex: embarque imediato) e destino logístico (ex: Redespacho Curitiba — exigência de paletização impecável).' },
      { id: 'm1_2', text: 'Parametrização do Produto: Relação dos campos da OP com a máquina: diâmetro do tubete (uso obrigatório do gabarito TAF), largura nominal em milímetros, espessura nominal em micras e peso total programado (Kg).' },
      { id: 'm1_3', text: 'Parametrização Térmica: Acesso à página de temperaturas via tecla F9 e inserção dos setpoints detalhados conforme o formulário FMPD 013.' },
      { id: 'm1_4', text: 'Registro de Desvios: Obrigatoriedade de registrar no apontamento de produção qualquer ajuste térmico ou de velocidade solicitado pelo Líder de Produção para fins de rastreabilidade.' }
    ],
    evaluationCriteria: [
      'O treinando deve ler uma OP aleatória e configurar corretamente os parâmetros térmicos na tela F9.',
      'O treinando deve usar o gabarito TAF para conferir as dimensões do tubete.'
    ]
  },
  {
    id: 'm2',
    title: 'Módulo 2: Sistema de Alimentação e Troca Contínua de Lotes',
    focus: 'Abastecimento correto e procedimentos para evitar contaminação ou quebra de fluxo na rosca.',
    technicalContent: [
      { id: 'm2_1', text: 'Alimentação Padrão: Abastecimento das caixas utilizando sacos de 25 kg ou big bags; posicionamento correto das mangueiras de sucção e funcionamento do sistema de vácuo até os funis.' },
      { id: 'm2_2', text: 'Procedimento de Troca Contínua: Esvaziar completamente a caixa com o material em uso.' },
      { id: 'm2_3', text: 'Procedimento de Troca Contínua: Remover a "caneta" (tubo de sucção) e monitorar visualmente o material baixar no silo superior.' },
      { id: 'm2_4', text: 'Procedimento de Troca Contínua: Encher a caixa com a nova resina/lote.' },
      { id: 'm2_5', text: 'Procedimento de Troca Contínua: Assim que baixar o material do silo superior, fechar a válvula de passagem para o silo inferior.' },
      { id: 'm2_6', text: 'Procedimento de Troca Contínua: Inserir a caneta na nova resina e aguardar a sucção puxar o material para o silo superior.' },
      { id: 'm2_7', text: 'Procedimento de Troca Contínua: Monitorar o nível no silo inferior pela tela de observação. Quando estiver quase acabando (quase sumindo na tela), abrir a válvula de passagem.' },
      { id: 'm2_8', text: 'Ponto Crítico de Segurança do Processo: Entender que o material nunca deve baixar completamente na rosca para evitar entrada de ar, falhas graves na extrusão e defeitos no filme.' }
    ],
    evaluationCriteria: [
      'O treinando deve executar uma troca completa de lote em tempo hábil, sem deixar o nível de resina zerar na rosca.'
    ]
  },
  {
    id: 'm3',
    title: 'Módulo 3: Preparação Mecânica, Passagem de Filme e Purga',
    focus: 'Sincronismo da máquina, segurança mecânica e o trajeto correto do filme.',
    technicalContent: [
      { id: 'm3_1', text: 'Verificação dos Eixos: Diferenciação e posicionamento do Eixo de Partida (conjunto da biela, sem cola, tração inicial) e do Eixo de Troca (com adesivo, posicionado na corrente caricatore para troca automática).' },
      { id: 'm3_2', text: 'Proteção de Corte (Raccolta): Comando via chave "Protezione Taglio: Chiusa / Aperta"; obrigatoriedade de manter a faca abaixada (casinha de proteção) para o reinício seguro do processo e conscientização sobre o risco crítico de esmagamento.' },
      { id: 'm3_3', text: 'Sequenciamento das Bielas Centrais: Operação da chave seletora em estágios obrigatórios (1º Estágio: Biela Frontal; 2º Estágio: Biela Inferior/Traseira). Compreensão da importância técnica da biela na absorção de vibrações e prevenção do empenamento ("efeito telescópico").' },
      { id: 'm3_4', text: 'Passagem de Corda Guia e Filme: Execução exata do percurso técnico de 9 pontos (do rolo superior do bailarino, passando pelos trainos 1 e 2, rolo expansor "banana", até a raccolta).' },
      { id: 'm3_5', text: 'Procedimento de Purga: Inicialização com velocidade de linha a 10 m/min e rotações específicas nas extrusoras (A=25 RPM, B=50 RPM, C=50 RPM, D=25 RPM) para expulsão de impurezas. Destinação obrigatória do refugo de purga para reciclagem na Erema.' }
    ],
    evaluationCriteria: [
      'O treinando deve realizar a passagem da corda guia seguindo a sequência correta dos rolos sem cruzar ou inverter o fluxo.',
      'Demonstração prática do acionamento sequencial das bielas.'
    ]
  },
  {
    id: 'm4',
    title: 'Módulo 4: Rampa de Velocidade e Estabilização de Periféricos',
    focus: 'Subida controlada de velocidade e acionamento dos periféricos de qualidade.',
    technicalContent: [
      { id: 'm4_1', text: 'Partida Inicial (Parte 2): Ligar a linha a 12 m/min e ajustar extrusoras para os parâmetros iniciais (A=4, B=17, C=17, D=4). Acionar fixa-bordas, Centralina Fissabordi, Aspirazione Fume, Spannung Voltage ELTEX, Lamaria, Robuste, Mandata Macianato, Granulatore e Aspirazione Refili.' },
      { id: 'm4_2', text: 'Rampa de Velocidade Cruzada (Parte 3): Aumentar velocidade da linha para 40 m/min e alterar extrusoras para A=20, B=50, C=50, D=20.' },
      { id: 'm4_3', text: 'Rampa de Velocidade Cruzada (Parte 3): Elevar a linha até 90 m/min e, sequencialmente, subir extrusoras e linha até os parâmetros finais programados no FMPD 013.' },
      { id: 'm4_4', text: 'Fechamento de Processo: Ligar o motor da cola, sinalizar auxiliares para inserção das facas, executar a troca de eixos e fechar as bielas.' }
    ],
    evaluationCriteria: [
      'O operador em treinamento deve executar a rampa de velocidade sem romper o filme e sem gerar desalinhamento nos refiles.'
    ]
  },
  {
    id: 'm5',
    title: 'Módulo 5: Ajustes de Processo e Preenchimento do Checklist (FMPD 050)',
    focus: 'Monitoramento visual, entendimento físico das variáveis do filme e conformidade técnica.',
    technicalContent: [
      { id: 'm5_1', text: 'Rolo Polidor (Borracha): Verificar se está fechado contra o Chill-Roll 1 para eliminar o colchão de ar, garantindo choque térmico, transparência e redução do neck-in. Inspecionar contra marcas ou desgaste na borracha.' },
      { id: 'm5_2', text: 'Bailarino (Compensador Passivo): Avaliar se atua suavemente como amortecedor para evitar micro trancos, eliminar o "efeito de borda alta" (degraus/estrias) e manter a memória elástica do filme.' },
      { id: 'm5_3', text: 'Aspirazione Fumi: Garantir que está ligado para exaustão de gases tóxicos, proteção do operador e para evitar que vapores condensados manchem o filme quente.' },
      { id: 'm5_4', text: 'Lamária (Lâmina de Ar Aspirante): Controlar os parâmetros para fixar as bordas contra o Chill-Roll, combater o neck-in e assegurar o resfriamento rápido que evita o aspecto fosco ("leitoso").' },
      { id: 'm5_5', text: 'Altura do Chill-Roll (Air Gap): Monitorar a distância física até a matriz para evitar instabilidade na bolha e oscilações de espessura.' },
      { id: 'm5_6', text: 'Linha de Névoa (Frost Line): Utilizar como ferramenta de ajuste visual da matriz. Mapear que uma linha mais baixa indica filme mais grosso e linha mais alta indica filme mais fino. O objetivo é mantê-la perfeitamente reta e paralela à matriz.' },
      { id: 'm5_7', text: 'Fixa-Borda (Estática - Spannung Voltage): Verificar visualmente o arco voltaico e a limpeza das pontas dos eletrodos contra o acúmulo de névoa de resina. (Filme balançando = tensão baixa; faíscas azuis constantes no metal = eletrodo fora do filme).' },
      { id: 'm5_8', text: 'Motor da Cola: Inspeção do alerta crítico — o motor pode apresentar giro visual externo falso se a rosca interna estiver quebrada (gerando filme sem adesivo).' },
      { id: 'm5_9', text: 'Ciclo de Refile: Monitoramento constante do ciclo de refile pelos auxiliares para evitar oscilações térmicas/pressão e impedir entupimentos/transbordo de material moído.' }
    ],
    evaluationCriteria: [
      'O treinando deve preencher integralmente o formulário FMPD 050 em campo e explicar visualmente o comportamento da linha de névoa e do fixa-borda.'
    ]
  },
  {
    id: 'm6',
    title: 'Módulo 6: Procedimento de Parada Padronizada da Linha',
    focus: 'Desaceleração segura da linha, minimizando a geração de refugo e protegendo os componentes mecânicos.',
    technicalContent: [
      { id: 'm6_1', text: 'Desaceleração do Operador: Utilizar o comando F3 até reduzir a linha para 100 m/min.' },
      { id: 'm6_2', text: 'Desaceleração do Operador: Baixar extrusoras de forma alternada e progressiva para A=20, B=50, C=50, D=20 giros/min.' },
      { id: 'm6_3', text: 'Desaceleração do Operador: Reduzir a linha para 40 m/min.' },
      { id: 'm6_4', text: 'Desaceleração do Operador: Ajustar extrusoras para os setpoints finais mínimos: A=2, B=17, C=17, D=2 giros/min.' },
      { id: 'm6_5', text: 'Desaceleração do Operador: Estabilizar a linha em 12 m/min e então desligar as extrusoras (A, B, C, D) e a linha.' },
      { id: 'm6_6', text: 'Desaceleração do Operador: Desligar periféricos: Cola, Lamária, Robuste, Centralina Fissabordi e Aspirazione Fumi.' },
      { id: 'm6_7', text: 'Desaceleração do Operador: Finalização mecânica protetiva: Recuar o carro do Chill-Roll até o limite final de curso e suspender os fixadores de borda.' },
      { id: 'm6_8', text: 'Sincronismo com o Auxiliar: Auxiliar deve monitorar a espessura durante a queda e recuar as facas dos refiles laterais.' },
      { id: 'm6_9', text: 'Sincronismo com o Auxiliar: Monitorar o Traino 2; se houver perda de tensão ou recuo do filme, executar a abertura/fechamento rápido do Rolo Prensor do Traino 2 para estabilização.' },
      { id: 'm6_10', text: 'Sincronismo com o Auxiliar: Abrir definitivamente o prensor do Traino 2 a 40 m/min.' },
      { id: 'm6_11', text: 'Sincronismo com o Auxiliar: Após a parada total, abrir os prensores dos trainos 1 e 2, retirar as facas centrais e executar o corte manual.' }
    ],
    evaluationCriteria: [
      'O operador deve realizar o desligamento da máquina seguindo a risca a rampa de desaceleração descrita, sem causar o travamento de material ou danos por temperatura nos rolos.'
    ]
  },
  {
    id: 'm7',
    title: 'Módulo 7: Preenchimento do Apontamento de Produção (FMPD 024 - Rev 006)',
    focus: 'Precisão na coleta de dados, rastreabilidade de insumos/lotes e controle de indicadores operacionais.',
    technicalContent: [
      { id: 'm7_1', text: 'Cabeçalho e Identificação Básica: Obrigatoriedade do preenchimento legível do nome do operador, número da matrícula, turno correspondente (A ou B), identificação do equipamento (Cast) e data correta do processo.' },
      { id: 'm7_2', text: 'Rastreabilidade de Insumos e Lotes: Lançar meticulosamente a porcentagem (%) utilizada em cada extrusora (Ext. A, Ext. B, Ext. C, Ext. D) e o respectivo número de Lote para cada matéria-prima.' },
      { id: 'm7_3', text: 'Rastreabilidade de Insumos e Lotes: Tipos obrigatórios de insumos a rastrear: Buteno, Hexeno, Metaloceno, Agente de Pega, Reciclado e Octeno.' },
      { id: 'm7_4', text: 'Rastreabilidade de Insumos e Lotes: Registro obrigatório do Código do Tubete em uso no setup.' },
      { id: 'm7_5', text: 'Acompanhamento de Processo: Realização e registro pontual dos testes a cada 3 horas contendo: Hora, OP, Tipo de Produto, Gramatura, Espessura e o Peso individual das Bobinas (posições 1 a 6).' },
      { id: 'm7_6', text: 'Acompanhamento de Processo: Avaliação visual do filme e teste dinâmico de Pega (Aderência), marcando como Conforme [C] ou Não Conforme [NC].' },
      { id: 'm7_7', text: 'Acompanhamento de Processo: Monitoramento de Estiramento (no início e no retorno pós-limpeza) e verificação física da Largura do filme.' },
      { id: 'm7_8', text: 'Apontamento de Perdas e Paradas: Paradas de Máquina: Cronometrar e classificar em minutos os motivos exatos (Limpeza, Manutenção Mecânica/Elétrica, Dificuldade Operacional ou Outros) com códigos MEC, ELE, LG, UTI.' },
      { id: 'm7_9', text: 'Apontamento de Perdas e Paradas: Controle de Perdas (Eco B, Eco A e Borra): Lançar Total Bruto, Tara, Peso Líquido e quantidade de tubetes gerados para Eco B, além do peso da Borra.' },
      { id: 'm7_10', text: 'Checklist Operacional do Processo: Validar fisicamente: Bielas fechadas, prensores dos Trainos 1 e 2 fechados, posicionamento seguro das facas, funcionamento do bailarino, Chill-Roll avançado, Cola ligada, exaustor ativo, parâmetros de Lamária adequados, altura da bolha/linha de névoa reta e gerador estático.' }
    ],
    evaluationCriteria: [
      'O treinando deve preencher manualmente um formulário FMPD 024 simulado completo baseado em um turno real de produção, sem deixar lacunas nos lotes de insumos ou nos horários de monitoramento de 3 em 3 horas.'
    ]
  },
  {
    id: 'm8',
    title: 'Módulo Especial: Movimentação e Pesagem de Material ECO B',
    focus: 'Controle exato do índice de perdas de resina por meio da pesagem e descontos padrão.',
    technicalContent: [
      { id: 'm8_1', text: 'Fórmula de Peso Líquido: Peso Líquido ECO B = Peso Bruto Total - Peso do Palete - (Quantidade de Tubetes x 1.10 Kg).' },
      { id: 'm8_2', text: 'Peso Bruto Total: Valor total indicado na balança mecânica ou digital (inclui palete, tubetes e o filme stretch acumulado).' },
      { id: 'm8_3', text: 'Peso do Palete: Desconto fixo baseado na tara padrão do palete de madeira utilizado na movimentação da unidade.' },
      { id: 'm8_4', text: 'Peso Fixo do Tubete: Fica estabelecido o valor padrão de 1.10 Kg por tubete para a execução dos cálculos na planilha e apontamento diário no RDO.' },
      { id: 'm8_5', text: 'Exemplo de Aplicação: Balança registrou 150 Kg. Desconto do palete (ex: 25 Kg) e de 10 tubetes (10 x 1.10 = 11 Kg). Cálculo: 150 - 25 - 11 = 114 Kg líquidos.' }
    ],
    evaluationCriteria: [
      'O operador ou auxiliar deve realizar uma pesagem real na balança e aplicar a fórmula descontando corretamente o valor fixo de 1.10 Kg por tubete antes de encaminhar o material para a Erema.'
    ]
  },
  {
    id: 'm9',
    title: 'Módulo 9: Registro de Homologação Final do Operador',
    focus: 'Certificação final de todas as etapas concluídas e aptidão para operar.',
    technicalContent: [
      { id: 'm9_1', text: 'Certificação de Conclusão: Certificamos que o colaborador concluiu satisfatoriamente todas as etapas do treinamento técnico operacional, estando apto a operar o equipamento em conformidade.' },
      { id: 'm9_2', text: 'Assinatura do Operador, Instrutor e Supervisor para homologação definitiva.' }
    ],
    evaluationCriteria: [
      'O treinando concluiu satisfatoriamente todas as etapas do treinamento técnico operacional.'
    ]
  }
];

export function OperationalTraining({
  employees,
  sheets,
  onSaveSheet,
  onDeleteSheet,
  onClose,
  canManage,
  isReadOnly,
  onBlockedAction
}: OperationalTrainingProps) {
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  const [activeModuleId, setActiveModuleId] = useState<string>('m1');
  const [isCreating, setIsCreating] = useState(false);
  
  // New Sheet form states
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newInstructor, setNewInstructor] = useState('');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTargetRole, setNewTargetRole] = useState('Operador de Extrusora');

  // Interactive calculator for Module 8 (ECO B)
  const [brutoWeight, setBrutoWeight] = useState<number>(150);
  const [paleteWeight, setPaleteWeight] = useState<number>(25);
  const [tubetesQty, setTubetesQty] = useState<number>(10);

  // Filter state
  const [filterTerm, setFilterTerm] = useState('');

  // Confirmation dialog state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Gantt visual focus / full width state
  const [isGanttExpanded, setIsGanttExpanded] = useState(false);

  // Weight format utility: 1000 threshold
  // "sempre que o valor for igual o maior que mil deve ser apresentado com T se for menor que mil deve ser apresentado com Kg"
  const formatWeight = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)} T`;
    }
    return `${value.toFixed(1)} Kg`;
  };

  // Get active sheet
  const activeSheet = useMemo(() => {
    if (selectedSheetId) {
      return sheets.find(s => s.id === selectedSheetId) || null;
    }
    return sheets[0] || null;
  }, [sheets, selectedSheetId]);

  // Handle active sheet ID sync if list changes or is initialized
  useEffect(() => {
    if (sheets.length > 0 && !selectedSheetId) {
      setSelectedSheetId(sheets[0].id);
    }
  }, [sheets, selectedSheetId]);

  // List of employees without training sheets (filtered and sorted)
  const availableEmployees = useMemo(() => {
    const uniqueMap = new Map<string, Employee>();
    
    employees.forEach(emp => {
      if (!emp || !emp.name) return;
      if (emp.isSilenced) return;
      const statusNorm = (emp.status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim();
      const nameNorm = (emp.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim();
      
      if (statusNorm.includes('silenciad') || nameNorm.includes('silenciad')) return;

      // Status must be active, on leave, or in contracting
      const isStatusValid = ['ativo', 'atestado', 'em contratacao'].includes(statusNorm);
      if (!isStatusValid) return;

      // Filter out placeholder names
      if (nameNorm.includes('excluid')) return;
      if (nameNorm === 'vaga disponivel' || nameNorm === 'disponivel') return;
      if (nameNorm === 'vaga em contratacao' || nameNorm === 'em contratacao') return;
      if (nameNorm.includes('vaga disponivel') || nameNorm.includes('vaga em contratacao') || nameNorm.includes('vaga excluida')) return;
      
      // Exclude those who already have a sheet
      const hasSheet = sheets.some(s => s.employeeId === emp.id || (emp.registration && s.registration === emp.registration));
      if (hasSheet) return;
      
      // Prevent duplicates in the selector
      const key = emp.registration || emp.name.trim().toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, emp);
      }
    });

    const filtered = Array.from(uniqueMap.values());

    // Sort by shift, then machine, then name
    return filtered.sort((a, b) => {
      const shiftA = a.shift || '';
      const shiftB = b.shift || '';
      if (shiftA !== shiftB) return shiftA.localeCompare(shiftB);

      const machineA = a.machine || '';
      const machineB = b.machine || '';
      if (machineA !== machineB) return machineA.localeCompare(machineB);

      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });
  }, [employees, sheets]);

  // Handle new sheet creation
  const handleCreateSheet = async () => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Criação Bloqueada', 'A criação de fichas de treinamento operacional não é permitida no Modo de Leitura.');
      }
      setIsCreating(false);
      return;
    }
    if (!newEmployeeId) return;
    const emp = employees.find(e => e.id === newEmployeeId);
    if (!emp) return;

    // Initialize all 9 modules
    const modulesInit: Record<string, OperatorTrainingModule & { 
      status: 'not_started' | 'in_progress' | 'completed';
      startDate: string;
      endDate: string;
      instructor: string;
      completedTopics: string[];
    }> = {};

    OPERATIONAL_TOPICS.forEach((m, idx) => {
      const daysOffset = idx * 3; // default offsets for timeline visual structure
      const start = new Date(newStartDate);
      start.setDate(start.getDate() + daysOffset);
      const end = new Date(start);
      end.setDate(end.getDate() + 3);

      modulesInit[m.id] = {
        completed: false,
        status: 'not_started',
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        instructor: newInstructor,
        notes: '',
        completedTopics: []
      };
    });

    const newSheet: Partial<OperatorTrainingSheet> = {
      employeeId: emp.id,
      employeeName: emp.name,
      registration: emp.registration || 'S/M',
      instructorName: newInstructor,
      startDate: newStartDate,
      progress: 0,
      targetRole: newTargetRole,
      currentRole: emp.role || 'Auxiliar',
      modules: modulesInit as any
    };

    await onSaveSheet(newSheet);
    setIsCreating(false);
    // Reset fields
    setNewEmployeeId('');
    setNewInstructor('');
  };

  // Toggle a technical topic checkpoint
  const handleToggleTopicCheckpoint = async (moduleId: string, topicId: string) => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Alteração Bloqueada', 'A marcação de tópicos do treinamento operacional não é permitida no Modo de Leitura.');
      }
      return;
    }
    if (!activeSheet) return;

    const moduleData = activeSheet.modules[moduleId] || {
      completed: false,
      status: 'not_started',
      completedTopics: []
    };

    const currentCompleted = Array.isArray(moduleData.completedTopics) 
      ? [...moduleData.completedTopics] 
      : [];

    const isTopicCompleted = currentCompleted.includes(topicId);
    let updatedCompleted: string[];

    if (isTopicCompleted) {
      updatedCompleted = currentCompleted.filter(id => id !== topicId);
    } else {
      updatedCompleted = [...currentCompleted, topicId];
    }

    const totalTopics = OPERATIONAL_TOPICS.find(t => t.id === moduleId)?.technicalContent.length || 1;
    const progressPercent = Math.round((updatedCompleted.length / totalTopics) * 100);

    let newStatus: 'not_started' | 'in_progress' | 'completed' = 'in_progress';
    if (updatedCompleted.length === 0) {
      newStatus = 'not_started';
    } else if (updatedCompleted.length === totalTopics) {
      newStatus = 'completed';
    }

    const updatedModule = {
      ...moduleData,
      completed: newStatus === 'completed',
      status: newStatus,
      completedTopics: updatedCompleted
    };

    const updatedModules = {
      ...activeSheet.modules,
      [moduleId]: updatedModule
    };

    // Calculate overall sheet progress
    let totalProgressSum = 0;
    OPERATIONAL_TOPICS.forEach(m => {
      const mData = updatedModules[m.id];
      if (mData) {
        const mTopics = mData.completedTopics || [];
        const mTotal = m.technicalContent.length;
        totalProgressSum += Math.round((mTopics.length / mTotal) * 100);
      }
    });
    const overallProgress = Math.round(totalProgressSum / OPERATIONAL_TOPICS.length);

    await onSaveSheet({
      ...activeSheet,
      modules: updatedModules,
      progress: overallProgress
    });
  };

  // Update dates and instructor details for a module
  const handleUpdateModuleDates = async (
    moduleId: string, 
    fields: { startDate?: string; endDate?: string; instructor?: string; notes?: string; status?: 'not_started' | 'in_progress' | 'completed' }
  ) => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Alteração Bloqueada', 'A edição de dados de módulos de treinamento não é permitida no Modo de Leitura.');
      }
      return;
    }
    if (!activeSheet) return;

    const moduleData = activeSheet.modules[moduleId] || {
      completed: false,
      status: 'not_started',
      completedTopics: []
    };

    const updatedModule = {
      ...moduleData,
      ...fields,
      completed: fields.status === 'completed' ? true : fields.status === 'not_started' ? false : moduleData.completed
    };

    // If marked as completed fully but no individual topics checked, check them all. Or vice versa
    if (fields.status === 'completed' && (!moduleData.completedTopics || moduleData.completedTopics.length < (OPERATIONAL_TOPICS.find(t => t.id === moduleId)?.technicalContent.length || 0))) {
      const allTopicIds = OPERATIONAL_TOPICS.find(t => t.id === moduleId)?.technicalContent.map(tc => tc.id) || [];
      updatedModule.completedTopics = allTopicIds;
    } else if (fields.status === 'not_started') {
      updatedModule.completedTopics = [];
    }

    const updatedModules = {
      ...activeSheet.modules,
      [moduleId]: updatedModule
    };

    // Calculate overall sheet progress
    let totalProgressSum = 0;
    OPERATIONAL_TOPICS.forEach(m => {
      const mData = updatedModules[m.id];
      if (mData) {
        const mTopics = mData.completedTopics || [];
        const mTotal = m.technicalContent.length;
        totalProgressSum += Math.round((mTopics.length / mTotal) * 100);
      }
    });
    const overallProgress = Math.round(totalProgressSum / OPERATIONAL_TOPICS.length);

    await onSaveSheet({
      ...activeSheet,
      modules: updatedModules,
      progress: overallProgress
    });
  };

  // Calculate timelines for the Gantt Chart
  const ganttTimelineDates = useMemo(() => {
    if (!activeSheet) return [];
    
    // Find earliest start date and latest end date to bound our Gantt view
    let minDate = new Date();
    let maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // 30 day default span

    let first = true;
    OPERATIONAL_TOPICS.forEach(m => {
      const mData = activeSheet.modules[m.id];
      if (mData?.startDate) {
        const d = new Date(mData.startDate);
        if (first || d < minDate) {
          minDate = d;
        }
        first = false;
      }
      if (mData?.endDate) {
        const d = new Date(mData.endDate);
        if (d > maxDate) {
          maxDate = d;
        }
      }
    });

    // Make sure we have a nice clean range of around 4 columns/periods representing the progress
    const datesList: string[] = [];
    const current = new Date(minDate);
    // Add weeks or 5-day intervals
    for (let i = 0; i < 5; i++) {
      datesList.push(current.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }));
      current.setDate(current.getDate() + 7);
    }
    return { datesList, minDate, maxDate };
  }, [activeSheet]);

  // Gantt bar calculation helper
  const getGanttStyle = (startStr?: string, endStr?: string) => {
    if (!startStr || !endStr || !ganttTimelineDates.minDate) return { left: '0%', width: '10%' };
    
    const start = new Date(startStr);
    const end = new Date(endStr);
    const totalDuration = ganttTimelineDates.maxDate.getTime() - ganttTimelineDates.minDate.getTime();
    
    if (totalDuration <= 0) return { left: '10%', width: '80%' };

    let leftPercent = ((start.getTime() - ganttTimelineDates.minDate.getTime()) / totalDuration) * 100;
    let widthPercent = ((end.getTime() - start.getTime()) / totalDuration) * 100;

    // Bound values to ensure they look pristine
    if (leftPercent < 0) leftPercent = 0;
    if (leftPercent > 95) leftPercent = 95;
    if (widthPercent < 5) widthPercent = 10; // minimum visible width
    if (leftPercent + widthPercent > 100) widthPercent = 100 - leftPercent;

    return {
      left: `${leftPercent.toFixed(1)}%`,
      width: `${widthPercent.toFixed(1)}%`
    };
  };

  // ECO B Weighing calculator: Formula from PDF page 8:
  // Peso Líquido = Peso Bruto - Peso Palete - (Tubetes * 1.10)
  const calculatedEcoBLiquid = useMemo(() => {
    const tubeteDiscount = tubetesQty * 1.10;
    const liquid = brutoWeight - paleteWeight - tubeteDiscount;
    return Math.max(0, liquid);
  }, [brutoWeight, paleteWeight, tubetesQty]);

  // Filter sheets based on search term
  const filteredSheets = useMemo(() => {
    if (!filterTerm) return sheets;
    return sheets.filter(s => 
      s.employeeName.toLowerCase().includes(filterTerm.toLowerCase()) || 
      s.registration.includes(filterTerm)
    );
  }, [sheets, filterTerm]);

  return (
    <>
      <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] w-full flex flex-col overflow-hidden shadow-xl animate-in fade-in duration-500 text-slate-800">
        
        {/* HEADER */}
        <div className="px-8 py-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 border border-violet-100 shadow-sm">
              <GraduationCap size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Treinamento Técnico Operacional</h2>
              <p className="text-[10px] text-violet-600 font-bold uppercase tracking-[0.2em] mt-0.5">Stretch Film Cast • Procedimento Operacional Padrão</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {canManage && (
              <button
                onClick={() => setIsCreating(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-black uppercase tracking-wider px-5 py-3 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Plus size={14} />
                Nova Ficha
              </button>
            )}

            <button 
              onClick={onClose}
              className="px-5 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-[10px] font-black uppercase tracking-wider shadow-sm"
            >
              <ArrowLeft size={14} />
              Voltar
            </button>
          </div>
        </div>

        {/* MAIN LAYOUT SPLIT */}
        <div className="grid grid-cols-1 xl:grid-cols-12 min-h-[68vh] divide-y xl:divide-y-0 xl:divide-x divide-slate-200 bg-white">
          
          {/* LEFT SIDEBAR: COLLABORATORS LIST */}
          {!isGanttExpanded && (
            <div className="xl:col-span-3 p-6 flex flex-col gap-4 bg-slate-50/50">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={16} />
                <input 
                  type="text" 
                  value={filterTerm}
                  onChange={e => setFilterTerm(e.target.value)}
                  placeholder="Buscar colaborador..." 
                  className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-500 transition-colors shadow-sm"
                />
              </div>

              <div className="flex-1 overflow-y-auto max-h-[50vh] xl:max-h-[60vh] space-y-2.5 pr-2 custom-scrollbar">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Colaboradores em Treinamento ({filteredSheets.length})</p>
                
                {filteredSheets.map(s => {
                  const isActive = activeSheet?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedSheetId(s.id); setIsCreating(false); }}
                      className={`w-full text-left p-4 pl-5 rounded-2xl border transition-all flex flex-col gap-2 cursor-pointer relative overflow-hidden ${
                        isActive 
                          ? 'bg-white border-violet-200 text-slate-950 shadow-md ring-1 ring-violet-500/5' 
                          : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50/50 hover:shadow-sm'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-violet-600 rounded-r-md" />
                      )}
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-mono font-black bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase tracking-wider">#{s.registration}</span>
                        <span className="text-[10px] font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100/50">{s.progress}%</span>
                      </div>

                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-tight text-slate-900 truncate">{s.employeeName}</h4>
                        <p className="text-[9px] font-semibold text-slate-500 mt-0.5">{s.targetRole || 'Operador Cast'}</p>
                      </div>

                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1 border border-slate-200/20">
                        <div className="bg-violet-500 h-full rounded-full transition-all duration-500" style={{ width: `${s.progress}%` }}></div>
                      </div>
                    </button>
                  );
                })}

                {filteredSheets.length === 0 && (
                  <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 bg-white">
                    <GraduationCap className="mx-auto text-slate-300 mb-2" size={32} />
                    <p className="text-[10px] font-bold uppercase tracking-wider">Nenhuma ficha encontrada</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RIGHT SIDE: INTERACTIVE DETAILS & GANTT */}
          <div className={`${isGanttExpanded ? 'xl:col-span-12' : 'xl:col-span-9'} p-8 flex flex-col gap-8 overflow-y-auto max-h-[75vh] custom-scrollbar bg-slate-50/30`}>
            
            <AnimatePresence mode="wait">
              {isCreating ? (
                /* CREATION FORM */
                <motion.div 
                  key="create-form"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Iniciar Nova Ficha de Treinamento</h3>
                    <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600 transition-colors text-xs font-black uppercase">Cancelar</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Colaborador</label>
                      <select 
                        value={newEmployeeId} 
                        onChange={e => setNewEmployeeId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 font-bold outline-none focus:border-violet-500 shadow-sm"
                      >
                        <option value="">Selecione o Colaborador...</option>
                        {availableEmployees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            [{emp.shift || 'Sem Turno'} - {emp.machine || 'Sem Máquina'}] {emp.name} ({emp.role || 'Auxiliar'}) - Matrícula: {emp.registration || 'S/M'}
                          </option>
                        ))}
                      </select>
                      {availableEmployees.length === 0 && (
                        <p className="text-[9px] text-amber-600 font-semibold px-1">Todos os colaboradores cadastrados já possuem fichas ou não há colaboradores ativos.</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instrutor do Treinamento</label>
                      <input 
                        type="text" 
                        value={newInstructor} 
                        onChange={e => setNewInstructor(e.target.value)}
                        placeholder="Nome do Instrutor / Gestor"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 font-semibold outline-none focus:border-violet-500 shadow-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Função Alvo / Treinamento</label>
                      <input 
                        type="text" 
                        value={newTargetRole} 
                        onChange={e => setNewTargetRole(e.target.value)}
                        placeholder="Ex: Operador de Extrusora Stretch"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 font-semibold outline-none focus:border-violet-500 shadow-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Início</label>
                      <input 
                        type="date" 
                        value={newStartDate} 
                        onChange={e => setNewStartDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 font-semibold outline-none focus:border-violet-500 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button 
                      onClick={handleCreateSheet}
                      disabled={!newEmployeeId}
                      className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-wider px-6 py-3.5 rounded-xl flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Check size={14} />
                      Iniciar Cronograma e Tópicos
                    </button>
                  </div>
                </motion.div>
              ) : activeSheet ? (
                /* TRAINING CONTENT VIEW */
                <motion.div 
                  key="content-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-8"
                >
                  {/* COLLABORATOR DETAILS */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-violet-600 text-white rounded-2xl flex items-center justify-center font-black text-base shadow-md shadow-violet-500/20 uppercase">
                        {activeSheet.employeeName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black uppercase text-slate-900 tracking-tight">{activeSheet.employeeName}</h3>
                          <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">REG: {activeSheet.registration}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Função Alvo: <span className="text-violet-600">{activeSheet.targetRole}</span> • Início: {new Date(activeSheet.startDate).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                      <div className="text-right">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Progresso Geral</span>
                        <span className="text-2xl font-black text-slate-800">{activeSheet.progress}%</span>
                      </div>
                      <div className="w-24 bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                        <div className="bg-gradient-to-r from-violet-600 to-emerald-500 h-full rounded-full" style={{ width: `${activeSheet.progress}%` }}></div>
                      </div>

                      {canManage && (
                        <button
                          onClick={() => setConfirmDeleteId(activeSheet.id)}
                          className="p-3 bg-red-50 text-red-500 border border-red-100 hover:bg-red-600 hover:text-white rounded-xl transition-all cursor-pointer shadow-sm"
                          title="Excluir Ficha de Treinamento"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 📊 GANTT CHART (CRONOGRAMA DE TREINAMENTO VISUAL) */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <CalendarRange className="text-violet-500" size={18} />
                          <h4 className="text-sm font-black uppercase tracking-wider text-slate-800">Gráfico de Gantt do Cronograma</h4>
                        </div>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Planejamento temporal e progresso de cada etapa operacional</p>
                      </div>
                      
                      {/* Subtitle / Legend / Action Button */}
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300"></span>
                          <span className="text-[9px] font-bold uppercase text-slate-500">Não Iniciado</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600/30"></span>
                          <span className="text-[9px] font-bold uppercase text-slate-500">Em Andamento</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-600/30"></span>
                          <span className="text-[9px] font-bold uppercase text-slate-500">Concluído</span>
                        </div>

                        <button
                          onClick={() => setIsGanttExpanded(!isGanttExpanded)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer border border-violet-100/60"
                          title={isGanttExpanded ? "Reduzir visualização" : "Expandir para tela inteira"}
                        >
                          {isGanttExpanded ? (
                            <>
                              <Minimize2 size={12} />
                              Minimizar
                            </>
                          ) : (
                            <>
                              <Maximize2 size={12} />
                              Tela Cheia
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Gantt Matrix Grid */}
                    <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-inner text-xs">
                      {/* Gantt Header Columns */}
                      <div className="grid grid-cols-12 border-b border-slate-100 bg-slate-50/70 py-3.5 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                        <div className="col-span-5 px-5 border-r border-slate-200/60">Módulo / Tópico de Treinamento</div>
                        <div className="col-span-7 px-5 relative flex justify-between">
                          {ganttTimelineDates.datesList.map((dt, index) => (
                            <span key={index} className="text-[8px] font-extrabold tracking-tight text-slate-500">{dt}</span>
                          ))}
                        </div>
                      </div>

                      {/* Gantt Rows */}
                      <div className={`divide-y divide-slate-100 overflow-y-auto custom-scrollbar ${isGanttExpanded ? 'max-h-[60vh]' : 'max-h-[38vh]'}`}>
                        {OPERATIONAL_TOPICS.map(m => {
                          const mData = activeSheet.modules[m.id] || { status: 'not_started', startDate: '', endDate: '' };
                          const isModuleActive = activeModuleId === m.id;
                          const barPosition = getGanttStyle(mData.startDate, mData.endDate);

                          const totalTopics = m.technicalContent.length;
                          const completedTopicsCount = mData.completedTopics?.length || 0;
                          const moduleProgress = Math.round((completedTopicsCount / totalTopics) * 100);

                          let barBgColor = 'bg-slate-100 border-slate-200 text-slate-500';
                          let textBadgeColor = 'text-slate-400 bg-slate-50 border border-slate-200/60';
                          let progressColor = 'bg-slate-300';
                          let labelStatus = 'Não Iniciado';

                          if (mData.status === 'completed') {
                            barBgColor = 'bg-emerald-50/70 border-emerald-200 text-emerald-800';
                            textBadgeColor = 'text-emerald-700 bg-emerald-50 border border-emerald-200/60';
                            progressColor = 'bg-emerald-500';
                            labelStatus = 'Concluído';
                          } else if (mData.status === 'in_progress') {
                            barBgColor = 'bg-amber-50/70 border-amber-200 text-amber-800';
                            textBadgeColor = 'text-amber-700 bg-amber-50 border border-amber-200/60';
                            progressColor = 'bg-amber-500';
                            labelStatus = 'Em Andamento';
                          }

                          return (
                            <div 
                              key={m.id} 
                              onClick={() => setActiveModuleId(m.id)}
                              className={`grid grid-cols-12 py-3 items-center cursor-pointer transition-all relative ${
                                isModuleActive 
                                  ? 'bg-violet-50/30' 
                                  : 'hover:bg-slate-50/30'
                              }`}
                            >
                              {/* Left selection bar line for active module */}
                              {isModuleActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500 rounded-r" />
                              )}

                              <div className="col-span-5 px-5 border-r border-slate-100 flex items-center justify-between pr-3 gap-3">
                                <div className="min-w-0">
                                  <p className={`font-black uppercase text-[10px] truncate ${isModuleActive ? 'text-violet-600' : 'text-slate-700'}`}>{m.title.split(':')[0]}</p>
                                  <p className="text-[8px] text-slate-400 truncate font-semibold mt-0.5">{m.title.split(':')[1] || m.focus}</p>
                                </div>
                                <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${textBadgeColor}`}>{labelStatus}</span>
                              </div>

                              <div className="col-span-7 px-5 relative h-8 flex items-center">
                                {/* Vertical background grid lines matching the header's 5 columns */}
                                <div className="absolute inset-x-5 inset-y-0 flex justify-between pointer-events-none">
                                  {[0, 1, 2, 3, 4].map((_, idx) => (
                                    <div key={idx} className="w-[1px] h-full border-l border-dashed border-slate-100" />
                                  ))}
                                </div>

                                {/* Horizontal guiding baseline */}
                                <div className="absolute left-5 right-5 h-[1px] bg-slate-100 top-1/2 -translate-y-1/2" />
                                
                                {/* Visual timelines bar */}
                                <div 
                                  className={`absolute h-5 rounded-full border transition-all duration-300 flex items-center overflow-hidden shadow-sm group ${barBgColor}`}
                                  style={{ left: barPosition.left, width: barPosition.width }}
                                >
                                  {/* Inner Progress Indicator */}
                                  {mData.status !== 'not_started' && (
                                    <div 
                                      className={`h-full opacity-20 transition-all duration-500 ${progressColor}`}
                                      style={{ width: `${moduleProgress}%` }}
                                    />
                                  )}
                                  
                                  {/* Text indicator inside the bar or hover tooltip */}
                                  <div className="absolute inset-0 flex items-center justify-center px-1 pointer-events-none text-[8px] font-black font-mono">
                                    {moduleProgress > 0 && (
                                      <span>{moduleProgress}%</span>
                                    )}
                                  </div>

                                  {mData.startDate && mData.endDate && (
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-800 text-white px-2 py-0.5 rounded border border-slate-700 -top-7 left-1/2 -translate-x-1/2 absolute z-10 text-[8px] shadow-md font-bold">
                                      {mData.startDate.split('-').reverse().slice(0, 2).join('/')} - {mData.endDate.split('-').reverse().slice(0, 2).join('/')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM SPLIT: SELECTED MODULE DETAILS & INTERACTIVE TOPICS CHECKPOINTS */}
                  {!isGanttExpanded && (() => {
                    const moduleConfig = OPERATIONAL_TOPICS.find(t => t.id === activeModuleId);
                    const moduleData = activeSheet.modules[activeModuleId] || {
                      completed: false,
                      status: 'not_started',
                      completedTopics: [],
                      startDate: '',
                      endDate: '',
                      instructor: activeSheet.instructorName || '',
                      notes: ''
                    };

                    if (!moduleConfig) return null;

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        
                        {/* LEFT COLUMN: MODULE DETAILS & DATES UPDATE */}
                        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm">
                          <div>
                            <span className="text-[8px] font-black text-violet-700 bg-violet-100 px-2.5 py-1 rounded uppercase tracking-widest">{moduleConfig.title.split(':')[0]}</span>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mt-3">{moduleConfig.title.split(':')[1] || moduleConfig.title}</h4>
                            <p className="text-[10px] text-slate-500 font-semibold mt-2 italic">Foco: {moduleConfig.focus}</p>
                          </div>

                          <div className="space-y-4 pt-4 border-t border-slate-100">
                            <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Parâmetros do Cronograma</h5>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Início Planejado</label>
                                <input 
                                  type="date" 
                                  value={moduleData.startDate || ''}
                                  onChange={e => handleUpdateModuleDates(activeModuleId, { startDate: e.target.value })}
                                  disabled={!canManage}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-[10px] text-slate-700 font-semibold outline-none focus:border-violet-500 shadow-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Término Planejado</label>
                                <input 
                                  type="date" 
                                  value={moduleData.endDate || ''}
                                  onChange={e => handleUpdateModuleDates(activeModuleId, { endDate: e.target.value })}
                                  disabled={!canManage}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-[10px] text-slate-700 font-semibold outline-none focus:border-violet-500 shadow-sm"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Instrutor Responsável</label>
                              <input 
                                type="text" 
                                value={moduleData.instructor || ''}
                                onChange={e => handleUpdateModuleDates(activeModuleId, { instructor: e.target.value })}
                                placeholder="Nome do instrutor"
                                disabled={!canManage}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-[10px] text-slate-700 font-semibold outline-none focus:border-violet-500 shadow-sm"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Status Geral do Módulo</label>
                              <select
                                value={moduleData.status || 'not_started'}
                                onChange={e => handleUpdateModuleDates(activeModuleId, { status: e.target.value as any })}
                                disabled={!canManage}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-[10px] text-slate-700 font-semibold outline-none focus:border-violet-500 shadow-sm"
                              >
                                <option value="not_started">Não Iniciado</option>
                                <option value="in_progress">Em Andamento</option>
                                <option value="completed">Concluído</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Notas / Observações</label>
                              <textarea 
                                value={moduleData.notes || ''}
                                onChange={e => handleUpdateModuleDates(activeModuleId, { notes: e.target.value })}
                                placeholder="Notas de desempenho..."
                                rows={3}
                                disabled={!canManage}
                                className="w-full bg-white border border-slate-200 rounded-lg p-3 text-[10px] text-slate-700 font-semibold outline-none focus:border-violet-500 custom-scrollbar resize-none shadow-sm"
                              />
                            </div>
                          </div>
                        </div>

                        {/* RIGHT COLUMN: TECHNICAL TOPICS CHECKLIST */}
                        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm">
                          
                          {/* Topics header */}
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                              <ListTodo className="text-violet-500" size={16} />
                              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Conteúdo Técnico / Tópicos de Treinamento</h4>
                            </div>
                            <span className="text-[9px] font-mono font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded border border-violet-100/60">
                              {moduleData.completedTopics?.length || 0} / {moduleConfig.technicalContent.length} Tópicos
                            </span>
                          </div>

                          {/* Topics List Checkpoints */}
                          <div className="space-y-3 max-h-[38vh] overflow-y-auto custom-scrollbar pr-1">
                            {moduleConfig.technicalContent.map(tc => {
                              const isChecked = moduleData.completedTopics?.includes(tc.id);
                              return (
                                <button
                                  key={tc.id}
                                  onClick={() => canManage && handleToggleTopicCheckpoint(activeModuleId, tc.id)}
                                  disabled={!canManage}
                                  className={`w-full text-left p-4 rounded-2xl border transition-all flex gap-3.5 items-start ${isChecked ? 'bg-emerald-50/30 border-emerald-200/60 text-slate-800' : 'bg-slate-50/50 border-slate-200/60 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                                >
                                  {isChecked ? (
                                    <CheckSquare size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                                  ) : (
                                    <Square size={18} className="text-slate-300 shrink-0 mt-0.5" />
                                  )}
                                  <p className="text-xs font-semibold leading-relaxed">{tc.text}</p>
                                </button>
                              );
                            })}
                          </div>

                          {/* Evaluation success criteria / checkoff */}
                          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2.5">
                            <div className="flex items-center gap-2 text-amber-600">
                              <AlertCircle size={14} />
                              <h5 className="text-[9px] font-black uppercase tracking-wider">Critérios de Avaliação Prática</h5>
                            </div>
                            <ul className="list-disc pl-4 text-[10px] font-semibold text-slate-500 space-y-1 leading-relaxed">
                              {moduleConfig.evaluationCriteria.map((ec, idx) => (
                                <li key={idx}>{ec}</li>
                              ))}
                            </ul>
                          </div>

                          {/* Module 8 interactive weighing integration */}
                          {activeModuleId === 'm8' && (
                            <div className="bg-violet-50/20 border border-violet-100/60 rounded-2xl p-5 space-y-4">
                              <div className="flex items-center gap-2 text-violet-600">
                                <Scale size={16} />
                                <h5 className="text-[10px] font-black uppercase tracking-wider">Calculadora Integrada: Desconto de Tara (ECO B)</h5>
                              </div>

                              <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Peso Bruto Total</label>
                                  <input 
                                    type="number" 
                                    value={brutoWeight}
                                    onChange={e => setBrutoWeight(Number(e.target.value))}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Peso do Palete</label>
                                  <input 
                                    type="number" 
                                    value={paleteWeight}
                                    onChange={e => setPaleteWeight(Number(e.target.value))}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Qtd Tubetes (1.10 Kg cd)</label>
                                  <input 
                                    type="number" 
                                    value={tubetesQty}
                                    onChange={e => setTubetesQty(Number(e.target.value))}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Peso Líquido ECO B Calculado:</span>
                                {/* Weight rule threshold visual trigger */}
                                <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-3 py-1 rounded-lg">
                                  {formatWeight(calculatedEcoBLiquid)}
                                </span>
                              </div>
                            </div>
                          )}

                        </div>

                      </div>
                    );
                  })()}

                </motion.div>
              ) : (
                /* EMPTY VIEW STAGE */
                <motion.div 
                  key="empty-stage"
                  className="flex flex-col items-center justify-center py-20 text-center text-slate-400"
                >
                  <GraduationCap size={48} className="text-slate-300 mb-4" />
                  <h4 className="text-sm font-black uppercase text-slate-400 tracking-wider">Selecione ou Inicie um Treinamento</h4>
                  <p className="text-xs font-semibold text-slate-500 mt-1 max-w-sm leading-relaxed">Não há fichas criadas para colaboradores. Clique no botão acima para iniciar o plano operacional por tópicos e visualizar o gráfico de Gantt.</p>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>

      </div>

      {/* Confirmation Dialog for Deletions */}
      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (isReadOnly) {
            if (onBlockedAction) {
              onBlockedAction('Exclusão Bloqueada', 'A exclusão de fichas de treinamento operacional não é permitida no Modo de Leitura.');
            }
            setConfirmDeleteId(null);
            return;
          }
          if (confirmDeleteId) {
            onDeleteSheet(confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
        title="Confirmar Exclusão de Ficha"
        message="Tem certeza de que deseja excluir permanentemente esta ficha de treinamento operacional do sistema e do banco de dados?"
        confirmText="Excluir Permanentemente"
        cancelText="Cancelar"
        type="danger"
      />
    </>
  );
}
