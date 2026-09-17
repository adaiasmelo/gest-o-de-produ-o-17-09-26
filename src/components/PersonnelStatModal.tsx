import React, { useState, useMemo } from 'react';
import { X, Search, Users, HardHat, Briefcase, UserPlus, Factory, Building2, Clock, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { Employee } from '../types';

export type PersonnelStatType = 'colaboradores' | 'operadores' | 'auxiliares' | 'vagas';

export interface VacancyDetail {
  id: string;
  sector: string;
  machine: string;
  shift: string;
  role: string;
  status: 'Em Aberto' | 'Em Contratação';
  candidateName?: string;
}

interface PersonnelStatModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: PersonnelStatType | null;
  employees: Employee[];
  vacancies: VacancyDetail[];
}

export const PersonnelStatModal: React.FC<PersonnelStatModalProps> = ({
  isOpen,
  onClose,
  type,
  employees,
  vacancies
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('todos');
  const [copied, setCopied] = useState(false);

  const normalize = (s?: string) => (s || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const isEmployed = (status?: string) => {
    const s = normalize(status);
    return ['ativo', 'atestado', 'afastado'].includes(s);
  };

  const isRelevantSector = (s?: string) => {
    const n = normalize(s);
    return ['extrusao', 'reciclagem', 'fita', 'lideranca'].includes(n);
  };

  // Filter lists based on type
  const listData = useMemo(() => {
    if (!type) return [];

    if (type === 'colaboradores') {
      return employees.filter(e => isEmployed(e.status) && normalize(e.sector) !== 'lideranca' && isRelevantSector(e.sector))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    if (type === 'operadores') {
      return employees.filter(e => isEmployed(e.status) && normalize(e.sector) !== 'lideranca' && (e.role || '').toLowerCase().includes('operador'))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    if (type === 'auxiliares') {
      return employees.filter(e => isEmployed(e.status) && normalize(e.sector) !== 'lideranca' && (e.role || '').toLowerCase().includes('auxiliar'))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return [];
  }, [type, employees]);

  // Filtered employees by search and sector
  const filteredEmployees = useMemo(() => {
    if (type === 'vagas') return [];
    return listData.filter(emp => {
      const matchesSearch = 
        (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.registration || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.machine || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.sector || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.shift || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSector = sectorFilter === 'todos' || normalize(emp.sector) === normalize(sectorFilter);

      return matchesSearch && matchesSector;
    });
  }, [listData, searchTerm, sectorFilter, type]);

  // Filtered vacancies
  const filteredVacancies = useMemo(() => {
    if (type !== 'vagas') return [];
    return vacancies.filter(v => {
      const matchesSearch = 
        (v.sector || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.machine || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.shift || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.candidateName || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSector = sectorFilter === 'todos' || normalize(v.sector) === normalize(sectorFilter);

      return matchesSearch && matchesSector;
    });
  }, [vacancies, searchTerm, sectorFilter, type]);

  // Copy list to clipboard
  const handleCopy = () => {
    let text = '';
    if (type === 'vagas') {
      text = `RELAÇÃO DE VAGAS EM ABERTO (${filteredVacancies.length} vagas):\n\n` +
        filteredVacancies.map((v, i) => `${i + 1}. Setor: ${v.sector} | Máquina: ${v.machine} | Turno: ${v.shift} | Função: ${v.role} | Situação: ${v.status}${v.candidateName ? ` (${v.candidateName})` : ''}`).join('\n');
    } else {
      const title = type === 'colaboradores' ? 'COLABORADORES' : type === 'operadores' ? 'OPERADORES' : 'AUXILIARES';
      text = `RELAÇÃO DE ${title} (${filteredEmployees.length} registros):\n\n` +
        filteredEmployees.map((e, i) => `${i + 1}. Nome: ${e.name} | Matrícula: ${e.registration || 'S/M'} | Cargo: ${e.role} | Setor: ${e.sector} | Máquina: ${e.machine} | Turno: ${e.shift}`).join('\n');
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen || !type) return null;

  const typeConfig = {
    colaboradores: {
      title: 'Relação de Colaboradores Ativos',
      subtitle: 'Lista completa de todos os colaboradores alocados na fábrica',
      icon: <Users size={24} />,
      colorText: 'text-blue-600',
      colorBg: 'bg-blue-50',
      colorBorder: 'border-blue-200',
      colorBadge: 'bg-blue-600 text-white',
      count: listData.length
    },
    operadores: {
      title: 'Relação de Operadores Ativos',
      subtitle: 'Lista completa com nome e matrícula dos operadores de produção',
      icon: <HardHat size={24} />,
      colorText: 'text-emerald-600',
      colorBg: 'bg-emerald-50',
      colorBorder: 'border-emerald-200',
      colorBadge: 'bg-emerald-600 text-white',
      count: listData.length
    },
    auxiliares: {
      title: 'Relação de Auxiliares Ativos',
      subtitle: 'Lista completa com nome e matrícula dos auxiliares de produção',
      icon: <Briefcase size={24} />,
      colorText: 'text-amber-600',
      colorBg: 'bg-amber-50',
      colorBorder: 'border-amber-200',
      colorBadge: 'bg-amber-600 text-white',
      count: listData.length
    },
    vagas: {
      title: 'Relação de Vagas em Aberto',
      subtitle: 'Detalhamento das vagas disponíveis por setor, máquina e turno',
      icon: <UserPlus size={24} />,
      colorText: 'text-rose-600',
      colorBg: 'bg-rose-50',
      colorBorder: 'border-rose-200',
      colorBadge: 'bg-rose-600 text-white',
      count: vacancies.length
    }
  }[type];

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${typeConfig.colorBg} ${typeConfig.colorText} border ${typeConfig.colorBorder} shadow-sm`}>
              {typeConfig.icon}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{typeConfig.title}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide ${typeConfig.colorBadge}`}>
                  {typeConfig.count}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">{typeConfig.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
              title="Copiar lista para a área de transferência"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="p-4 sm:px-6 bg-white border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={type === 'vagas' ? "Buscar por setor, máquina, turno ou função..." : "Buscar por nome, matrícula, cargo, máquina..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['todos', 'extrusao', 'reciclagem', 'fita'].map((sec) => (
              <button
                key={sec}
                onClick={() => setSectorFilter(sec)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  sectorFilter === sec
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sec === 'todos' ? 'Todos' : sec === 'extrusao' ? 'Extrusão' : sec === 'reciclagem' ? 'Reciclagem' : 'Fita'}
              </button>
            ))}
          </div>
        </div>

        {/* Content Table / Cards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {type === 'vagas' ? (
            filteredVacancies.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="text-sm font-bold text-slate-700">Nenhuma vaga em aberto encontrada</p>
                <p className="text-xs text-slate-400">O quadro de vagas deste filtro está 100% preenchido.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredVacancies.map((v, idx) => (
                  <div
                    key={v.id}
                    className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-rose-300 transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 font-black text-xs flex items-center justify-center border border-rose-100">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{v.role}</p>
                          <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mt-0.5">
                            <Factory size={12} className="text-slate-400" />
                            {v.sector} &bull; {v.machine}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        v.status === 'Em Contratação'
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-rose-100 text-rose-700 border border-rose-200'
                      }`}>
                        {v.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                      <span className="flex items-center gap-1 font-semibold text-slate-500">
                        <Clock size={12} />
                        Turno: <strong className="text-slate-700">{v.shift}</strong>
                      </span>
                      {v.candidateName && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                          Candidato: {v.candidateName}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            filteredEmployees.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-700">Nenhum colaborador encontrado</p>
                <p className="text-xs text-slate-400">Verifique os termos de busca ou o filtro de setor.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">Nome Completo</th>
                        <th className="py-3 px-4">Matrícula</th>
                        <th className="py-3 px-4">Cargo</th>
                        <th className="py-3 px-4">Setor / Máquina</th>
                        <th className="py-3 px-4">Turno</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredEmployees.map((emp, index) => (
                        <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-center font-bold text-slate-400 text-[11px]">
                            {index + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                            {emp.name || 'Sem Nome'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                            {emp.registration || <span className="text-slate-400 font-sans font-normal italic">S/M</span>}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                            {emp.role || '-'}
                          </td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            <span className="font-semibold text-slate-800">{emp.sector}</span>
                            <span className="text-slate-400 mx-1">&bull;</span>
                            <span className="text-slate-600">{emp.machine}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-medium">
                            {emp.shift || '-'}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              normalize(emp.status) === 'ativo'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : normalize(emp.status) === 'atestado'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {emp.status || 'Ativo'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between text-xs text-slate-500">
          <span>
            Exibindo <strong className="text-slate-800">{type === 'vagas' ? filteredVacancies.length : filteredEmployees.length}</strong> de <strong className="text-slate-800">{typeConfig.count}</strong> registros
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 active:scale-95 transition-all shadow-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
