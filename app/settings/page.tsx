'use client';

import React, { useState } from 'react';
import { useData } from '@/lib/store';
import { Plus, Trash2, Tag, ChevronRight } from 'lucide-react';

export default function SettingsPage() {
  const { categories, addCategory, deleteCategory } = useData();
  const [newCatName, setNewCatName] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await addCategory(newCatName.trim());
      setNewCatName('');
      setToast({ message: 'Categoria adicionada com sucesso!', type: 'success' });
    } catch (err: any) {
      if (err.message === 'DUPLICATE_CATEGORY') {
        setToast({ message: 'Esta categoria já existe.', type: 'error' });
      } else {
        setToast({ message: 'Erro ao adicionar categoria.', type: 'error' });
      }
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (id.startsWith('default-')) {
      setToast({ message: 'Categorias padrão não podem ser excluídas.', type: 'error' });
      return;
    }
    try {
      await deleteCategory(id);
      setToast({ message: 'Categoria removida com sucesso!', type: 'success' });
    } catch (err) {
      setToast({ message: 'Erro ao remover categoria.', type: 'error' });
    }
  };

  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-24 right-8 z-[100] px-6 py-3 rounded-2xl shadow-2xl border animate-in slide-in-from-right-8 duration-300 ${toast.type === 'success' ? "bg-primary/10 border-primary/20 text-primary" : "bg-error/10 border-error/20 text-error"}`}>
          <p className="text-sm font-bold">{toast.message}</p>
        </div>
      )}

      {/* Header Section */}
      <div className="mb-10">
        <nav className="flex items-center space-x-2 text-xs text-outline mb-2 uppercase tracking-[0.2em]">
          <span>Sistema</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-primary font-bold">Configurações</span>
        </nav>
        <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tighter text-on-surface">Configurações Base</h1>
        <p className="text-outline mt-2 max-w-md font-sans">Gerencie as categorias de despesas e preferências da sua conta.</p>
      </div>

      <div className="bg-surface-container-low rounded-3xl p-6 md:p-8 border border-outline-variant/10 shadow-xl shadow-black/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Categorias de Despesas</h2>
            <p className="text-sm text-outline">Personalize as categorias usadas nos lançamentos financeiros.</p>
          </div>
        </div>

        <div className="flex gap-3 mb-8">
          <input 
            type="text" 
            placeholder="Nova categoria..." 
            className="flex-1 bg-surface-container-highest border-none focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm text-on-surface"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
          />
          <button 
            onClick={handleAddCategory}
            className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:brightness-110 transition-all flex items-center gap-2 active:scale-95"
            disabled={!newCatName.trim()}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Adicionar</span>
          </button>
        </div>

        <div className="space-y-3">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/5">
              <span className="font-medium text-sm text-on-surface">{cat.name}</span>
              {!cat.id.startsWith('default-') && (
                <button 
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="p-2 text-outline hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                  title="Excluir categoria"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-center text-outline italic py-6">Nenhuma categoria cadastrada.</p>
          )}
        </div>
      </div>
    </div>
  );
}
