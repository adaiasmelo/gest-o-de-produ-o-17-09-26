import { ProductionEntry, Employee, PersonnelLog } from './types';

export const DEFAULT_OPERATORS: string[] = [
  "EVERSON PEREIRA DA SILVA", "ERIVAN FONTES DE SOUZA", "CARLOS PHILLIP BATISTA DA SILVA", "CIDONEIDE OLIVEIRA DE LIMA", "DEYWIS JUNIO SOUZA MENEZES", 
  "NAHIM VIEIRA DA SILVA", "EDILSON DA SILVA BENTES", "MARCELO DA SILVA CASTRO", "CHRISTIAN DA SILVA PIMENTEL", "FABIO ANDRE BELCHIOR MATOS", "Jocelan"
];
export const INITIAL_DATA: ProductionEntry[] = [
  { "date": "2026-01-29", "operator": "EDILSON DA SILVA BENTES", "machine": "Cast 1", "shift": "Noturno 1", "grossWeight": 12439, "tara": 0, "netWeight": 12439, "volumes": 0, "tubetes": 0, "ecoA": 0, "ecoBP": 139, "ecoBM": 0, "borraTotal": 0, "manutencaoMin": 0, "processoMin": 0, "outrosMin": 0, "id": "qlzunsyps", "updatedAt": "2026-01-29T00:00:00Z", "userId": "initial" },
  { "date": "2026-01-29", "operator": "CARLOS PHILLIP BATISTA DA SILVA", "machine": "Cast 2", "shift": "Noturno 1", "grossWeight": 12141, "tara": 337, "netWeight": 11804, "volumes": 0, "tubetes": 0, "ecoA": 0, "ecoBP": 412, "ecoBM": 0, "borraTotal": 0, "manutencaoMin": 0, "processoMin": 0, "outrosMin": 0, "id": "d6ryythfd", "updatedAt": "2026-01-29T00:00:00Z", "userId": "initial" },
  { "date": "2026-01-29", "operator": "NAHIM VIEIRA DA SILVA", "machine": "Cast 2", "shift": "Diurno 1", "grossWeight": 16576, "tara": 456, "netWeight": 16120, "volumes": 0, "tubetes": 0, "ecoA": 0, "ecoBP": 245, "ecoBM": 0, "borraTotal": 0, "manutencaoMin": 0, "processoMin": 24, "outrosMin": 0, "id": "5qsc3utu6", "updatedAt": "2026-01-29T00:00:00Z", "userId": "initial" },
  { "date": "2026-01-29", "operator": "ERIVAN FONTES DE SOUZA", "machine": "Cast 1", "shift": "Diurno 1", "grossWeight": 9106, "tara": 265, "netWeight": 8841, "volumes": 0, "tubetes": 0, "ecoA": 0, "ecoBP": 670, "ecoBM": 0, "borraTotal": 0, "manutencaoMin": 0, "processoMin": 30, "outrosMin": 0, "id": "xoljlhxv5", "updatedAt": "2026-01-29T00:00:00Z", "userId": "initial" }
];

export const GOAL_VALUE = 1200000;

export const INITIAL_EMPLOYEES: Employee[] = [
  // EXTRUSÃO - DIURNO 1
  { id: "e1", registration: "1611", name: "MARCELO DA SILVA CASTRO", role: "Operador 1", sector: "Extrusão", machine: "Cast 1", shift: "Diurno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e2", registration: "1694", name: "MARCIO PONTES NEVES", role: "Auxiliar de Produção", sector: "Extrusão", machine: "Cast 1", shift: "Diurno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e3", registration: "1794", name: "EVERSON PEREIRA DA SILVA", role: "Operador 2", sector: "Extrusão", machine: "Cast 2", shift: "Diurno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e4", registration: "1834", name: "ADRIANO DA SILVA MACIEL", role: "Auxiliar de Produção", sector: "Extrusão", machine: "Cast 2", shift: "Diurno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e5", registration: "1844", name: "GILCIMAR CARLOS CORREA ARAUJO", role: "Auxiliar de Produção", sector: "Extrusão", machine: "Cast 2", shift: "Diurno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  
  // EXTRUSÃO - NOTURNO 1
  { id: "e6", registration: "1673", name: "CIDONEIDE OLIVEIRA DE LIMA", role: "Operador 1", sector: "Extrusão", machine: "Cast 1", shift: "Noturno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e7", registration: "1736", name: "JOAO VITOR CARVALHO DE MORAES", role: "Auxiliar de Produção", sector: "Extrusão", machine: "Cast 1", shift: "Noturno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e8", registration: "1856", name: "DIONISON FONSECA CORREA", role: "Auxiliar de Produção", sector: "Extrusão", machine: "Cast 1", shift: "Noturno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e9", registration: "1607", name: "DEYWIS JUNIO SOUZA MENEZES", role: "Operador 1", sector: "Extrusão", machine: "Cast 2", shift: "Noturno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e10", registration: "1828", name: "CARLOS ALBERTO DUARTE DOS ANJOS", role: "Auxiliar de Produção", sector: "Extrusão", machine: "Cast 2", shift: "Noturno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e11", registration: "1855", name: "ARINETO ALVES DE ANDRADE", role: "Auxiliar de Produção", sector: "Extrusão", machine: "Cast 2", shift: "Noturno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
 
  // EXTRUSÃO - DIURNO 2
  { id: "e12", registration: "1745", name: "ERIVAN FONTES DE SOUZA", role: "Operador 2", sector: "Extrusão", machine: "Cast 1", shift: "Diurno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e13", registration: "1807", name: "CHRISTIAN DA SILVA PIMENTEL", role: "Auxiliar de Produção", sector: "Extrusão", machine: "Cast 1", shift: "Diurno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e14", registration: "1725", name: "OEULER FERREIRA SOARES", role: "Auxiliar de Produção", sector: "Extrusão", machine: "Cast 1", shift: "Diurno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e15", registration: "1704", name: "NAHIM VIEIRA DA SILVA", role: "Operador 1", sector: "Extrusão", machine: "Cast 2", shift: "Diurno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e16", registration: "1808", name: "LENO DA SILVA FERREIRA", role: "Auxiliar de Produção", sector: "Extrusão", machine: "Cast 2", shift: "Diurno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
 
  // EXTRUSÃO - NOTURNO 2
  { id: "e17", registration: "1698", name: "CARLOS PHILLIP BATISTA DA SILVA", role: "Operador 1", sector: "Extrusão", machine: "Cast 1", shift: "Noturno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e18", registration: "1801", name: "JOAO AUGUSTO CARVALHO DIAS", role: "Auxiliar de Produção", sector: "Extrusão", machine: "Cast 1", shift: "Noturno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e19", registration: "1827", name: "PAULO VITOR BARROS DE SOUZA", role: "Auxiliar de Produção", sector: "Extrusão", machine: "Cast 1", shift: "Noturno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e20", registration: "1662", name: "EDILSON DA SILVA BENTES", role: "Operador 1", sector: "Extrusão", machine: "Cast 2", shift: "Noturno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e21", registration: "1792", name: "ENDREY LIMA VIANA", role: "Auxiliar de Produção", sector: "Extrusão", machine: "Cast 2", shift: "Noturno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e22", registration: "1796", name: "ALESSANDRO DE BRITO MARQUES", role: "Auxiliar de Produção", sector: "Extrusão", machine: "Cast 2", shift: "Noturno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
 
  // RECICLAGEM
  { id: "e23", registration: "0023", name: "Jocelan", role: "Operador 1", sector: "Reciclagem", machine: "Erema 1", shift: "Diurno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e24", registration: "1806", name: "FABIO ANDRE BELCHIOR MATOS", role: "Operador 1", sector: "Reciclagem", machine: "Erema 1", shift: "Diurno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
 
  // FITA ADESIVA
  { id: "e25", registration: "1795", name: "JORGE BARBOSA OLIVEIRA", role: "Operador 1", sector: "Fita", machine: "Ghezzi", shift: "Diurno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e26", registration: "1622", name: "MAURIZIO TAGLIATTI", role: "Auxiliar de Produção", sector: "Fita", machine: "Ghezzi", shift: "Diurno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e27", registration: "1575", name: "ANDRE PAULO DA SILVA", role: "Operador 1", sector: "Fita", machine: "Ghezzi", shift: "Diurno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e28", registration: "1702", name: "KEVEN AUGUSTO SILVA E SILVA", role: "Operador 1", sector: "Fita", machine: "Lintech", shift: "Comercial", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e29", registration: "1840", name: "FRANCISCO GEOVANY MOREIRA DA SILVA", role: "Operador 1", sector: "Fita", machine: "Lintech", shift: "Comercial", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e30", registration: "1849", name: "ADMILSON SENA DA SILVA", role: "Auxiliar de Produção", sector: "Fita", machine: "Wultec", shift: "Diurno 1", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" },
  { id: "e31", registration: "1857", name: "MARIO SANTOS DA SILVA JUNIOR", role: "Auxiliar de Produção", sector: "Fita", machine: "Wultec", shift: "Diurno 2", status: "Ativo", updatedAt: "2024-01-30T12:00:00Z" }
];

export const INITIAL_LOGS: PersonnelLog[] = [
  { "id": "l1", "date": new Date().toISOString(), "employeeName": "Sistema", "action": "Contratação", "details": "Importação inicial de quadro", "user": "Admin", "userId": "initial" }
];