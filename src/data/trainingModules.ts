export interface TrainingModule {
  id: string;
  label: string;
  weight: number;
  description: string;
}

export const ROLE_MODULES_MAP: Record<string, TrainingModule[]> = {
  'Auxiliar de Produção': [
    {
      id: 'm1',
      label: 'Abastecimento & Resina',
      weight: 10,
      description: 'Abastecimento das caixas utilizando resinas em sacos (25 kg) ou big bags de PEBDL (Polietileno de Baixa Densidade Linear).'
    },
    {
      id: 'm2',
      label: 'Operação de Sucção e Vácuo',
      weight: 10,
      description: 'Manuseio seguro das mangueiras de sucção conectadas aos funis de alimentação e acompanhamento do transporte a vácuo.'
    },
    {
      id: 'm3',
      label: 'Troca de Matéria-Prima (Preparação)',
      weight: 10,
      description: 'Procedimento para esvaziar completamente as caixas com resina antiga e remoção da "caneta" (tubo de sucção) da caixa (ITM 055).'
    },
    {
      id: 'm4',
      label: 'Manuseio de Tubetes de Filme Stretch',
      weight: 10,
      description: 'Conferência de diâmetro de tubetes de papelão utilizando o gabarito de conferência técnica TAF.'
    },
    {
      id: 'm5',
      label: 'Separação de Purga para Reciclagem',
      weight: 10,
      description: 'Retirada e corte do filme de purga na área do bailarino e destinação correta para reciclagem direta na extrusora Erema (Seção 1.5).'
    },
    {
      id: 'm6',
      label: 'Embalagem, Pesagem & Paletização',
      weight: 10,
      description: 'Montagem de paletes padrão com 8 bobinas por piso e total de 16 bobinas por palete (50 kg cada), seguindo o DOC 004.'
    },
    {
      id: 'm7',
      label: 'Segurança Ocupacional Básica & EPIs',
      weight: 10,
      description: 'Uso obrigatório de luvas térmicas, óculos, proteção auricular, calçado de segurança e atenção a áreas de alta temperatura.'
    },
    {
      id: 'm8',
      label: 'Limpeza Geral da Extrusora Cast 1',
      weight: 10,
      description: 'Limpeza de resíduos de plástico acumulados ao redor do carro, piso de operação e descarte correto de lixos.'
    },
    {
      id: 'm9',
      label: 'Organização de Bobinas Não Conformes',
      weight: 10,
      description: 'Separação e rotulagem correta dos refugos e materiais de transição sob a liderança do operador.'
    },
    {
      id: 'm10',
      label: 'Comunicação Operacional em Equipe',
      weight: 10,
      description: 'Regras de apoio imediato ao operador durante passagens de filme, setups de bobina e sinalizações visuais.'
    }
  ],
  'Operador 1': [
    {
      id: 'm1',
      label: 'Leitura de Ordem de Produção (OP)',
      weight: 10,
      description: 'Leitura de clientes, especificações (diâmetro de tubete, largura de 500mm, espessura de 25 micras) e quantidade total de KG (ITM 055).'
    },
    {
      id: 'm2',
      label: 'Checklist de Retomada de Processo',
      weight: 10,
      description: 'Preenchimento integral e correto do formulário FMPD 013 no início de todos os turnos de produção.'
    },
    {
      id: 'm3',
      label: 'Partida Básica de Linha (Purga)',
      weight: 10,
      description: 'Ligar a linha com velocidade inicial controlada de 10 m/min para acompanhamento visual (Seção 2).'
    },
    {
      id: 'm4',
      label: 'Acionamento das Extrusoras A, B, C e D',
      weight: 10,
      description: 'Ligar as extrusoras em rotações iniciais de purga (A: 25 RPM, B: 50 RPM, C: 50 RPM, D: 25 RPM) (Seção 2).'
    },
    {
      id: 'm5',
      label: 'Verificação do Caimento de Material',
      weight: 10,
      description: 'Inspeção visual direta da saída de polímero fundido na matriz plana antes de iniciar o esticamento (Seção 3).'
    },
    {
      id: 'm6',
      label: 'Posicionamento do Carro do Chill-Roll',
      weight: 10,
      description: 'Posicionamento do carro resfriador conforme a marcação correta e específica na régua física da máquina (Seção 4).'
    },
    {
      id: 'm7',
      label: 'Operação da Centralina Fissabordi',
      weight: 10,
      description: 'Ligar e testar os modos de funcionamento (Marcia, Arresto, Inserzione) da centralina para estabilidade das bordas.'
    },
    {
      id: 'm8',
      label: 'Controle de Exaustão (Aspirazione Fumi)',
      weight: 10,
      description: 'Verificar o funcionamento do extrator de gases e fumos tóxicos provenientes do aquecimento de resinas (Seção 9).'
    },
    {
      id: 'm9',
      label: 'Monitoramento do Motor de Cola',
      weight: 10,
      description: 'Controle e inspeção visual da rosca do motor de cola para assegurar o fluxo ideal de agente de pega (Vistamaxx).'
    },
    {
      id: 'm10',
      label: 'Lançamento de Dados e Apontamento',
      weight: 10,
      description: 'Preenchimento do relatório de produção e lançamento de pesos brutos, tara e pesagem de bobinas finais.'
    }
  ],
  'Operador 2': [
    {
      id: 'm1',
      label: 'Controle de Temperatura da Água',
      weight: 10,
      description: 'Configuração e monitoramento do Chill-Roll 1, Chill-Roll 2 e sistema de Recirculação de água.'
    },
    {
      id: 'm2',
      label: 'Gerenciamento de Setpoint vs Real (Visu)',
      weight: 10,
      description: 'Análise de dados térmicos na tela Siemens, identificação de desvios e controle térmico dos cilindros resfriadores.'
    },
    {
      id: 'm3',
      label: 'Ajuste Avançado de Zonas de Temperatura',
      weight: 10,
      description: 'Parametrização do cabeçote e cilindros acessando a tela técnica através do comando F9 (Seção 2).'
    },
    {
      id: 'm4',
      label: 'Técnica de Passagem de Corda e Filme',
      weight: 10,
      description: 'Percurso técnico da corda guia: rolo do bailarino, rolo guia frontal, traino 1, rolo expansor (banana), traino 2 e raccolta.'
    },
    {
      id: 'm5',
      label: 'Fechamento do Rolo Polidor',
      weight: 10,
      description: 'Fechamento correto do rolo de borracha (polidor) sobre o Chill-Roll 1 para eliminar bolsas de ar e dar transparência (Seção 6).'
    },
    {
      id: 'm6',
      label: 'Ajuste de Voltagem do Fixa-Borda',
      weight: 10,
      description: 'Operação e calibração do botão Spannung Voltage para aplicação de eletricidade estática estabilizadora nas bordas (Seção 13).'
    },
    {
      id: 'm7',
      label: 'Configuração e Altura do Chill-Roll',
      weight: 10,
      description: 'Regulagem física do Air Gap (distância da matriz ao rolo) para controle de encolhimento e estabilização de balão (Seção 11).'
    },
    {
      id: 'm8',
      label: 'Análise Visual da Linha de Névoa',
      weight: 10,
      description: 'Leitura técnica da linha de geada (Frost Line) para identificar visualmente pontos finos ou grossos no filme (Seção 12).'
    },
    {
      id: 'm9',
      label: 'Teste de Gramatura e Qualidade',
      weight: 10,
      description: 'Execução do Teste de Gramatura (FIT 014), Controle Visual (DOC 023) e Teste de Pega de adesividade de bobinas (Seção 4).'
    },
    {
      id: 'm10',
      label: 'Classificação de Não Conformidades',
      weight: 10,
      description: 'Segregação de ECO Stretch A (etiqueta amarela para retrabalho) e ECO Stretch B (etiqueta vermelha para reciclagem na Erema).'
    }
  ],
  'Operador 3': [
    {
      id: 'm1',
      label: 'Ajuste Fino de Lábio de Matriz (Flat Die)',
      weight: 10,
      description: 'Regulagem milimétrica através de parafusos de pressão/tração no cabeçote plano para uniformidade total de micras (Seção 3).'
    },
    {
      id: 'm2',
      label: 'Operação de Parada Controlada e Desaceleração',
      weight: 10,
      description: 'Uso de desaceleração controlada F3 para 100m/min, reduções progressivas de extrusora e desativação segura de periféricos (Seção 2.6).'
    },
    {
      id: 'm3',
      label: 'Troca de Telas e Filtro Hidráulico',
      weight: 10,
      description: 'Procedimento completo e seguro de desaperto e troca dos filtros de tela no canhão da extrusora sob alta pressão.'
    },
    {
      id: 'm4',
      label: 'Limpeza Técnica de Matriz com Latão',
      weight: 10,
      description: 'Limpeza correta dos lábios interno/externo da matriz utilizando espátulas de latão para evitar riscos (Seção 2.9).'
    },
    {
      id: 'm5',
      label: 'Diagnóstico de Falhas Mecânicas Complexas',
      weight: 10,
      description: 'Identificação de quebra de roscas internas (ex: motor de cola girando por fora mas estático por dentro).'
    },
    {
      id: 'm6',
      label: 'Otimização de Velocidades e Setup de Micra',
      weight: 10,
      description: 'Configuração avançada de velocidade de linha até 90 m/min e rotações de extrusora para garantir conformidade técnica (FMPD 013).'
    },
    {
      id: 'm7',
      label: 'Calibração e Sintonia do PID de Controle',
      weight: 10,
      description: 'Diagnóstico de oscilação térmica extrema e ajuste fino dos parâmetros do PID para eficiência energética.'
    },
    {
      id: 'm8',
      label: 'Controle de Desvios de Estiramento',
      weight: 10,
      description: 'Validação e testes de estiramento avançados (ITM 072/073) para assegurar o alongamento correto solicitado pelo cliente.'
    },
    {
      id: 'm9',
      label: 'Liderança e Coordenação de Turno',
      weight: 10,
      description: 'Gestão da equipe de auxiliares, distribuição de atividades e garantia do cumprimento das normas técnicas.'
    },
    {
      id: 'm10',
      label: 'Auditoria de Processo e Segurança Operacional',
      weight: 10,
      description: 'Garantia de conformidade técnica integral de todas as etapas produtivas com a norma geral ITM 055.'
    }
  ]
};

export const TRAINING_ROLES = Object.keys(ROLE_MODULES_MAP);
