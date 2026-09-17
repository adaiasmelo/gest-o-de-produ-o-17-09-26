import React, { useState } from 'react';
import { X, Save, Image as ImageIcon, Type, Layout } from 'lucide-react';
import { TrainingTemplate } from '../types';

interface TrainingTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: TrainingTemplate;
  onSave: (template: TrainingTemplate) => void;
}

const TrainingTemplateModal: React.FC<TrainingTemplateModalProps> = ({ 
  isOpen, 
  onClose, 
  template, 
  onSave 
}) => {
  const [formData, setFormData] = useState<TrainingTemplate>(template);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logoBase64: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <Layout size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Modelo da Ficha</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Personalizar layout do PDF</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logo da Empresa</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden">
                  {formData.logoBase64 ? (
                    <img src={formData.logoBase64} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon size={24} className="text-slate-300" />
                  )}
                </div>
                <label className="flex-1">
                  <span className="block px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-center cursor-pointer hover:bg-slate-50 transition-colors">
                    Alterar Logo
                  </span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código do Formulário</label>
                <input 
                  value={formData.formCode} 
                  onChange={e => setFormData({ ...formData, formCode: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                  placeholder="Ex: FMRH 010"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Type size={14} /> Textos do Cabeçalho
            </label>
            <div className="grid grid-cols-1 gap-4">
              <input 
                value={formData.companyName} 
                onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                placeholder="Empresa Linha 1 (Ex: MANU)"
              />
              <input 
                value={formData.subCompanyName} 
                onChange={e => setFormData({ ...formData, subCompanyName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                placeholder="Empresa Linha 2 (Ex: PACKAGING)"
              />
              <input 
                value={formData.subtitle} 
                onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                placeholder="Subtítulo (Ex: FITASA & AMAZÔNIA)"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fonte Títulos (pt)</label>
              <input 
                type="number"
                value={formData.titleFontSize} 
                onChange={e => setFormData({ ...formData, titleFontSize: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fonte Base (pt)</label>
              <input 
                type="number"
                value={formData.baseFontSize} 
                onChange={e => setFormData({ ...formData, baseFontSize: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Texto de Rodapé (Status/Revisão)</label>
            <textarea 
              value={formData.footerText} 
              onChange={e => setFormData({ ...formData, footerText: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all min-h-[80px] resize-none"
            />
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 bg-slate-50/30 flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
            Cancelar
          </button>
          <button 
            onClick={() => onSave(formData)} 
            className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            Salvar Layout
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrainingTemplateModal;
