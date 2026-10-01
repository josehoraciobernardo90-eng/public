
import React, { useState, useEffect } from 'react';
import { WasteContainer, ContainerStatus } from '../types';
import { ArrowLeft, Trash2 } from 'lucide-react';

interface ContainerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (container: WasteContainer) => void;
  onDelete?: (id: string) => void;
  initialData?: WasteContainer;
}

const ContainerFormModal: React.FC<ContainerFormModalProps> = ({ isOpen, onClose, onSubmit, onDelete, initialData }) => {
  const [formData, setFormData] = useState<Partial<WasteContainer>>({
    id: '',
    neighborhood: '',
    avenue: '',
    block: '',
    referencePoint: '',
    status: ContainerStatus.NORMAL,
    reportCount: 0,
    imageUrl: '',
    latitude: undefined,
    longitude: undefined
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        id: `CT-${Math.floor(Math.random() * 900) + 100}`,
        neighborhood: '',
        avenue: '',
        block: '',
        referencePoint: '',
        status: ContainerStatus.NORMAL,
        reportCount: 0,
        imageUrl: '',
        latitude: -19.0667,
        longitude: 33.6500
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.id && formData.neighborhood && formData.avenue) {
      onSubmit({
        ...formData,
        reportCount: formData.reportCount || 0,
        imageUrl: (formData.imageUrl || '').trim()
      } as WasteContainer);
      onClose();
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Selecione uma imagem válida para o contentor.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result as string | undefined;
      if (result) {
        setFormData((prev) => ({ ...prev, imageUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-900">
            {initialData ? 'Editar Contentor' : 'Novo Contentor'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-2 group">
            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID do Contentor</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={formData.id}
                onChange={e => setFormData({ ...formData, id: e.target.value })}
                readOnly={!!initialData}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bairro</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={formData.neighborhood}
                onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Avenida / Rua</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              value={formData.avenue}
              onChange={e => setFormData({ ...formData, avenue: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bloco / Quadra</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={formData.block}
                onChange={e => setFormData({ ...formData, block: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status Inicial</label>
              <select
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as ContainerStatus })}
              >
                <option value={ContainerStatus.NORMAL}>Normal (Vazio)</option>
                <option value={ContainerStatus.ALERT}>Alerta (Cheio)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ponto de Referência</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              value={formData.referencePoint}
              onChange={e => setFormData({ ...formData, referencePoint: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Imagem do contentor</label>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="URL da imagem do contentor ou placa"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={formData.imageUrl || ''}
                onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
              />
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-700 shadow-sm transition-all hover:bg-slate-50">
                Carregar imagem
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            {formData.imageUrl && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <img src={formData.imageUrl} alt="Preview do contentor" className="h-28 w-full object-cover" />
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-3">
            {initialData && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (initialData?.id) {
                    onDelete(initialData.id);
                    onClose();
                  }
                }}
                className="px-5 py-3 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-black rounded-xl border border-red-200 hover:border-red-600 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:scale-95 group cursor-pointer"
                title="Excluir este contentor"
              >
                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Excluir
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 text-xs uppercase tracking-wider"
            >
              {initialData ? 'Salvar Alterações' : 'Cadastrar Contentor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContainerFormModal;
