import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Edit2, Image as ImageIcon, Upload, Camera, ShieldAlert, Users, AlertCircle, Check, Sparkles } from 'lucide-react';
import { CompanyNotice } from '../types';

interface CompanyNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: 'rh' | 'safety';
  companyNotices: CompanyNotice[];
  onSaveNotice: (notice: CompanyNotice) => Promise<void> | void;
  onDeleteNotice: (id: string) => Promise<void> | void;
  isReadOnly?: boolean;
  onBlockedAction?: (title?: string, message?: string) => void;
}

const PRESET_IMAGES = {
  rh: [
    { label: 'Reunião / Equipe RH', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Treinamento / Auditório', url: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Fábrica / Colaboradores', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80' },
  ],
  safety: [
    { label: 'Segurança / Capacete & EPI', url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Operação com Segurança', url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Equipe Industrial / CIPA', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80' },
  ],
};

export const CompanyNoticeModal: React.FC<CompanyNoticeModalProps> = ({
  isOpen,
  onClose,
  category,
  companyNotices,
  onSaveNotice,
  onDeleteNotice,
  isReadOnly,
  onBlockedAction,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingNotice, setEditingNotice] = useState<CompanyNotice | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [formData, setFormData] = useState<Omit<CompanyNotice, 'id'>>({
    category: category,
    title: '',
    subtitle: '',
    description: '',
    imageUrl: '',
    imageCaption: '',
    priority: 'high',
    badgeText: category === 'rh' ? 'COMUNICADO RH' : 'SEGURANÇA DO TRABALHO',
    date: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      category,
      badgeText: prev.badgeText || (category === 'rh' ? 'COMUNICADO RH' : 'SEGURANÇA DO TRABALHO'),
    }));
  }, [category]);

  if (!isOpen) return null;

  const categoryNotices = companyNotices.filter((n) => n.category === category);

  const handleOpenNew = () => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Criação Bloqueada', 'A criação de novos avisos não é permitida no Modo de Leitura.');
      }
      return;
    }
    setEditingNotice(null);
    setFormData({
      category: category,
      title: '',
      subtitle: '',
      description: '',
      imageUrl: PRESET_IMAGES[category][0]?.url || '',
      imageCaption: '',
      priority: 'high',
      badgeText: category === 'rh' ? 'COMUNICADO DE RH' : 'CIPA & SEGURANÇA',
      date: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    });
    setIsFormOpen(true);
  };

  const handleEdit = (notice: CompanyNotice) => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Edição Bloqueada', 'A edição de avisos não é permitida no Modo de Leitura.');
      }
      return;
    }
    setEditingNotice(notice);
    setFormData({
      category: notice.category,
      title: notice.title,
      subtitle: notice.subtitle || '',
      description: notice.description,
      imageUrl: notice.imageUrl || '',
      imageCaption: notice.imageCaption || '',
      priority: notice.priority || 'high',
      badgeText: notice.badgeText || (category === 'rh' ? 'COMUNICADO DE RH' : 'SEGURANÇA DO TRABALHO'),
      date: notice.date || '',
    });
    setIsFormOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem é muito grande. Escolha uma foto de até 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData((prev) => ({ ...prev, imageUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Gravação Bloqueada', 'A gravação de comunicados não é permitida no Modo de Leitura.');
      }
      setIsFormOpen(false);
      setEditingNotice(null);
      return;
    }
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Preencha o Título e a Descrição do aviso.');
      return;
    }

    const noticeToSave: CompanyNotice = {
      id: editingNotice ? editingNotice.id : `notice_${Date.now()}`,
      ...formData,
      createdAt: editingNotice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveNotice(noticeToSave);
    setIsFormOpen(false);
    setEditingNotice(null);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className={`p-5 flex items-center justify-between border-b ${
          category === 'rh'
            ? 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white'
            : 'bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 text-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              {category === 'rh' ? <Users className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5 text-emerald-300" />}
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase">
                {category === 'rh' ? 'Gerenciar Avisos de RH' : 'Gerenciar Avisos de Segurança (SST)'}
              </h2>
              <p className="text-xs font-medium text-white/80">
                Os avisos serão exibidos em tela cheia na Projeção de TV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!isFormOpen ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
                  {categoryNotices.length} {categoryNotices.length === 1 ? 'Aviso Cadastrado' : 'Avisos Cadastrados'}
                </span>
                <button
                  onClick={handleOpenNew}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-md flex items-center gap-2 transition-all active:scale-95 ${
                    category === 'rh' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Aviso</span>
                </button>
              </div>

              {categoryNotices.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 space-y-3">
                  <div className="w-12 h-12 bg-slate-200 text-slate-500 rounded-2xl flex items-center justify-center mx-auto">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase">Nenhum aviso cadastrado nesta categoria</h3>
                    <p className="text-xs font-medium text-slate-500 max-w-sm mx-auto mt-1">
                      Clique em "Novo Aviso" para adicionar um comunicado com imagem e detalhes para a equipe.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 max-h-[380px] overflow-y-auto pr-1">
                  {categoryNotices.map((notice) => (
                    <div
                      key={notice.id}
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-4 hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {notice.imageUrl ? (
                          <img
                            src={notice.imageUrl}
                            alt={notice.title}
                            className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                              notice.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {notice.badgeText || 'AVISO'}
                            </span>
                            {notice.date && <span className="text-[10px] font-bold text-slate-400">{notice.date}</span>}
                          </div>
                          <h4 className="text-sm font-black text-slate-900 truncate mt-0.5">{notice.title}</h4>
                          <p className="text-xs text-slate-500 truncate">{notice.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEdit(notice)}
                          className="p-2 bg-white text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all active:scale-95"
                          title="Editar Aviso"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isReadOnly) {
                              if (onBlockedAction) {
                                onBlockedAction('Exclusão Bloqueada', 'A exclusão de avisos não é permitida no Modo de Leitura.');
                              }
                              return;
                            }
                            await onDeleteNotice(notice.id);
                          }}
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200 transition-all active:scale-95"
                          title="Excluir Aviso do Sistema"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Form Add/Edit */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  {editingNotice ? 'Editar Aviso' : 'Criar Novo Aviso'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Voltar à Lista
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Título do Aviso *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Campanha de Segurança / Comunicado Holerite"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Selo / Etiqueta Emblema
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: CAMPANHA CIPA / GESTÃO DE PESSOAS"
                    value={formData.badgeText}
                    onChange={(e) => setFormData((prev) => ({ ...prev, badgeText: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Nível de Prioridade
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="high">🔴 Alta / Urgente (Destaque Vermelho)</option>
                    <option value="medium">🟠 Média / Importante (Aviso Laranja)</option>
                    <option value="info">🔵 Informativa / Institucional (Azul)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Data ou Mês de Referência
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Julho/2026 ou Permanente"
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Conteúdo / Descrição do Aviso *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Escreva a mensagem clara para ser lida pelos colaboradores no painel..."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Upload & Imagem */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-slate-600" /> Imagem Ilustrativa do Aviso
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" /> Enviar Foto do Computador
                  </button>
                </div>

                {formData.imageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-48 bg-slate-900 flex items-center justify-center">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="max-h-48 w-auto object-contain rounded-2xl"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, imageUrl: '' }))}
                      className="absolute top-2 right-2 bg-rose-600 text-white p-1.5 rounded-full shadow-md hover:bg-rose-700"
                      title="Remover Imagem"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-500">Ou escolha uma imagem predefinida:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {PRESET_IMAGES[category].map((preset) => (
                        <button
                          key={preset.url}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, imageUrl: preset.url }))}
                          className="group relative rounded-xl overflow-hidden border border-slate-200 hover:border-blue-500 transition-all text-left"
                        >
                          <img src={preset.url} alt={preset.label} className="w-full h-16 object-cover" />
                          <span className="block text-[9px] font-extrabold text-slate-700 p-1 truncate bg-white">
                            {preset.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase shadow-lg transition-all"
                >
                  Salvar Aviso
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
