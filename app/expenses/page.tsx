'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { 
  ChevronRight, 
  UploadCloud, 
  Plus, 
  Calendar as CalendarIcon,
  PieChart,
  TrendingUp,
  Search,
  Download
} from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import ExpenseTable from '@/components/ExpenseTable';
import Modal from '@/components/Modal';
import { useData, Expense } from '@/lib/store';
import { doc, getDocFromServer, getDocsFromServer, collection, query, where } from 'firebase/firestore';
import { auth, db } from '@/firebase';

function ExpensesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(searchParams?.get('new') === 'true');
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const { expenses, addExpense, updateExpense, deleteExpense, projects, categories: savedCategories } = useData();

  const suppliers = Array.from(new Set(expenses.map(e => e.supplier))).filter(Boolean).sort();
  const expenseCategories = Array.from(new Set(expenses.map(e => e.category))).filter(Boolean).sort();
  const projectNames = projects.map(p => p.title).sort();
  
  // Combine saved categories with any existing ones in expenses that might have been deleted but still exist in old records, or just use saved ones. Often better to just show saved ones for new inputs, and all for filters.
  const filterCategories = Array.from(new Set([...expenseCategories, ...savedCategories.map(c => c.name)])).sort();
  const inputCategories = savedCategories.length > 0 ? savedCategories.map(c => c.name) : ['Operacional', 'Marketing', 'Folha de Pagamento', 'Impostos', 'Tecnologia'];

  useEffect(() => {
    if (searchParams?.get('new') === 'true') {
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.delete('new');
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [searchParams, pathname, router]);

  const [newExpense, setNewExpense] = useState({
    supplier: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    category: inputCategories[0] || '',
    project: ''
  });

  // Keep category in sync if it's empty
  useEffect(() => {
    if (!newExpense.category && inputCategories.length > 0) {
      const timer = setTimeout(() => {
        setNewExpense(prev => ({...prev, category: inputCategories[0]}));
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputCategories, newExpense.category]);

  // Set default project if available
  useEffect(() => {
    if (!newExpense.project && projectNames.length > 0) {
      const timer = setTimeout(() => {
        setNewExpense(prev => ({ ...prev, project: projectNames[0] }));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [projectNames, newExpense.project]);

  const handleCreateExpense = () => {
    if (!newExpense.supplier || !newExpense.amount || !newExpense.project) {
      setToast({ message: 'Por favor, preencha todos os campos obrigatórios.', type: 'error' });
      return;
    }

    const expense = {
      ...newExpense,
      description: 'Nova despesa registrada manualmente.',
      amount: `R$ ${newExpense.amount}`,
      status: 'on-track'
    };

    addExpense(expense);
    setToast({ message: 'Despesa registrada com sucesso!', type: 'success' });
    setIsNewExpenseOpen(false);
    setNewExpense({ supplier: '', amount: '', date: '', dueDate: '', category: 'Infraestrutura', project: '' });
  };

  const handleUpdateExpense = () => {
    if (!editingExpense) return;
    
    const id = editingExpense.id;
    if (!id) {
      console.error('Erro: ID da despesa não encontrado.', editingExpense);
      setToast({ message: 'Erro: ID da despesa não encontrado.', type: 'error' });
      return;
    }

    if (!editingExpense.supplier || !editingExpense.amount || !editingExpense.project) {
      setToast({ message: 'Por favor, preencha Fornecedor, Valor e Projeto.', type: 'error' });
      return;
    }

    let finalAmount = editingExpense.amount.toString();
    if (!finalAmount.startsWith('R$')) {
      const amountStr = finalAmount || '0';
      const numericValue = parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
      if (!isNaN(numericValue)) {
        finalAmount = `R$ ${numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      } else {
        finalAmount = `R$ ${finalAmount}`;
      }
    }

    // Call store update
    updateExpense(id, {
      supplier: editingExpense.supplier,
      amount: finalAmount,
      date: editingExpense.date,
      dueDate: editingExpense.dueDate,
      category: editingExpense.category,
      project: editingExpense.project,
      description: editingExpense.description
    });
    
    setToast({ message: 'Despesa atualizada com sucesso!', type: 'success' });
    setEditingExpense(null);
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setToast({ message: `Processando arquivo "${file.name}"...`, type: 'success' });
        
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            // Try to decode as UTF-8, if it fails or looks wrong, fallback to windows-1252
            const decoder = new TextDecoder('utf-8', { fatal: true });
            let text;
            try {
              text = decoder.decode(arrayBuffer);
            } catch (e) {
              // Fallback to windows-1252 for Latin-1 support
              text = new TextDecoder('windows-1252').decode(arrayBuffer);
            }
            
            const rows = text.split('\n').filter(row => row.trim() !== '');
            
            if (rows.length <= 1) {
              setToast({ message: 'O arquivo CSV está vazio ou contém apenas o cabeçalho.', type: 'error' });
              return;
            }

            // Expected format: Data do Pagamento, Data de Vencimento, Fornecedor, Descricao, Projeto, Categoria, Valor
            const dataRows = rows.slice(1);
            
            const importedRecords = dataRows.map(row => {
              const values = row.split(',').map(v => v.trim());
              return {
                date: values[0] || new Date().toISOString().split('T')[0],
                dueDate: values[1] || values[0] || new Date().toISOString().split('T')[0],
                supplier: values[2] || 'Fornecedor Desconhecido',
                description: values[3] || 'Importado via CSV',
                project: values[4] || 'Geral',
                category: values[5] || 'Outros',
                amount: values[6] ? (values[6].startsWith('R$') ? values[6] : `R$ ${values[6]}`) : 'R$ 0,00',
                status: 'on-track'
              };
            });

            for (const record of importedRecords) {
              await addExpense(record);
            }
            setToast({ message: `Importação concluída: ${importedRecords.length} novos registros adicionados.`, type: 'success' });
          } catch (err) {
            console.error('Erro ao processar CSV:', err);
            setToast({ message: 'Erro ao processar os dados do arquivo CSV.', type: 'error' });
          }
        };
        reader.onerror = () => {
          setToast({ message: 'Erro ao ler o arquivo CSV.', type: 'error' });
        };
        reader.readAsArrayBuffer(file);
      }
    };
    input.click();
  };

  const handleNewExpense = () => {
    setIsNewExpenseOpen(true);
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleExport = async () => {
    // Whitelist check before export
    if (!auth.currentUser?.email) {
      setToast({ message: 'Você precisa estar logado para exportar dados.', type: 'error' });
      return;
    }

    try {
      const whiteRef = doc(db, 'whitelist', auth.currentUser.email.toLowerCase());
      const whiteSnap = await getDocFromServer(whiteRef);
      
      if (!whiteSnap.exists() || whiteSnap.data().status !== 'ativo') {
        setToast({ message: 'Acesso negado: Seu e-mail não está na lista de autorizados.', type: 'error' });
        return;
      }
    } catch (err: any) {
      console.error('Erro ao verificar permissão de exportação:', err);
      // Se for erro de rede ou timeout, permitimos a exportação já que o usuário já passou pelo AuthProvider
      if (err?.message?.includes('offline') || 
          err?.code === 'unavailable' || 
          err?.code === 'deadline-exceeded' || 
          err?.message?.toLowerCase().includes('timeout')) {
        console.warn("Permitindo exportação devido a erro de rede ou timeout (Iframe).");
      } else {
        setToast({ message: 'Erro ao verificar permissões. Verifique sua conexão.', type: 'error' });
        return;
      }
    }

    setToast({ message: 'Buscando dados atualizados do servidor...', type: 'success' });

    try {
      // Buscamos os lançamentos diretamente do servidor para evitar problemas de stream no Iframe
      const q = query(collection(db, 'lancamentos'), where('userId', '==', auth.currentUser.uid));
      const snapshot = await getDocsFromServer(q);
      const expensesToExport = snapshot.docs.map(doc => doc.data() as Expense);

      if (expensesToExport.length === 0) {
        setToast({ message: 'Nenhum lançamento encontrado para exportar.', type: 'error' });
        return;
      }

      const content = "Data,Fornecedor,Descrição,Projeto,Categoria,Valor,Status\n" + 
        expensesToExport.map(e => `${e.date},${e.supplier},${e.description},${e.project},${e.category},${e.amount},${e.status}`).join("\n");
      const blob = new Blob([content], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Lancamentos_Financeiros_FinControl.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setToast({ message: 'Exportando registros de despesas para CSV...', type: 'success' });
    } catch (err) {
      console.error('Erro ao buscar lançamentos para exportação:', err);
      setToast({ message: 'Erro ao buscar dados para exportação. Tente novamente.', type: 'error' });
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = 'Data do Pagamento,Data de Vencimento,Fornecedor,Descrição,Projeto,Categoria,Valor\n2023-10-01,2023-10-05,Exemplo Fornecedor,Descrição da despesa,Projeto Exemplo,Infraestrutura,100.00';
    const blob = new Blob(['\ufeff', csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Modelo_Importacao_Despesas.csv';
    link.click();
    URL.revokeObjectURL(url);
    setToast({ message: 'Modelo CSV baixado com sucesso!', type: 'success' });
  };

  const handleFilterChange = (type: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (type === 'Fornecedor') {
      params.set('supplier', value);
    } else if (type === 'Categoria') {
      params.set('category', value);
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleDateChange = (field: 'start' | 'end', val: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set(field, val);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Toast Notification */}
      {toast && (
        <div className={cn(
          "fixed top-24 right-8 z-[100] px-6 py-3 rounded-2xl shadow-2xl border animate-in slide-in-from-right-8 duration-300",
          toast.type === 'success' ? "bg-primary/10 border-primary/20 text-primary" : "bg-error/10 border-error/20 text-error"
        )}>
          <p className="text-sm font-bold">{toast.message}</p>
        </div>
      )}
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <nav className="flex items-center space-x-2 text-xs text-outline mb-2 uppercase tracking-[0.2em]">
            <span>Finanças</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary font-bold">Despesas</span>
          </nav>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tighter text-on-surface">Registros Financeiros</h1>
          <p className="text-outline mt-2 max-w-md font-sans">Gerencie e monitore as despesas executivas em todos os projetos ativos do portfólio.</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 w-full">
          <div className="relative col-span-2 sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
            <input 
              className="bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 text-sm pl-10 pr-4 py-2.5 rounded-xl w-full sm:w-64 text-on-surface" 
              placeholder="Buscar despesas..." 
              type="text"
              defaultValue={searchParams?.get('q') || ''}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams?.toString() || '');
                if (e.target.value) params.set('q', e.target.value);
                else params.delete('q');
                router.replace(`${pathname}?${params.toString()}`);
              }}
            />
          </div>
          <button 
            onClick={handleDownloadTemplate}
            className="flex items-center justify-center px-4 py-3 bg-surface-container-high border border-primary/15 text-on-surface rounded-xl hover:bg-surface-bright transition-all font-semibold text-xs sm:text-sm active:scale-95 whitespace-nowrap"
          >
            <Download className="w-4 h-4 mr-2 text-primary" />
            Baixar Modelo
          </button>
          <button 
            onClick={handleImport}
            className="flex items-center justify-center px-4 py-3 bg-surface-container-high border border-primary/15 text-on-surface rounded-xl hover:bg-surface-bright transition-all font-semibold text-xs sm:text-sm active:scale-95 whitespace-nowrap"
          >
            <UploadCloud className="w-4 h-4 mr-2 text-primary" />
            Importar
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center justify-center px-4 py-3 bg-surface-container-high border border-primary/15 text-on-surface rounded-xl hover:bg-surface-bright transition-all font-semibold text-xs sm:text-sm active:scale-95 whitespace-nowrap"
          >
            <Download className="w-4 h-4 mr-2 text-primary" />
            Exportar
          </button>
          <button 
            onClick={handleNewExpense}
            className="col-span-2 sm:w-auto flex items-center justify-center px-6 py-3 bg-gradient-to-br from-primary to-on-primary-container text-on-primary rounded-xl shadow-lg shadow-primary/10 hover:brightness-110 transition-all font-bold text-sm active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Despesa
          </button>
        </div>
      </div>

      {/* Modals */}
      <Modal 
        isOpen={isNewExpenseOpen} 
        onClose={() => setIsNewExpenseOpen(false)} 
        title="Registrar Nova Despesa"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-outline uppercase">Fornecedor</label>
            <input 
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm" 
              placeholder="Ex: AWS, Google, etc." 
              value={newExpense.supplier}
              onChange={(e) => setNewExpense({ ...newExpense, supplier: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-outline uppercase">Projeto</label>
            <select 
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm" 
              value={newExpense.project}
              onChange={(e) => setNewExpense({ ...newExpense, project: e.target.value })}
            >
              <option value="" disabled>Selecione um projeto</option>
              {projectNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-outline uppercase">Valor (R$)</label>
            <input 
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm" 
              placeholder="0,00" 
              value={newExpense.amount}
              onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-outline uppercase">Data do Pagamento</label>
              <input 
                className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm" 
                type="date" 
                value={newExpense.date}
                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-outline uppercase">Data de Vencimento</label>
              <input 
                className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm" 
                type="date" 
                value={newExpense.dueDate}
                onChange={(e) => setNewExpense({ ...newExpense, dueDate: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-outline uppercase">Categoria</label>
            <select 
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm"
              value={newExpense.category}
              onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
            >
              {inputCategories.map(cat => (
                <option key={`new-${cat}`} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={handleCreateExpense}
            className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl mt-4"
          >
            Salvar Despesa
          </button>
        </div>
      </Modal>

      {/* Filter Bento */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="md:col-span-2 bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10 flex flex-col justify-between">
          <label className="text-[10px] uppercase tracking-widest text-outline mb-2 block">Intervalo de Datas</label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex-1 relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
              <input 
                className="w-full bg-surface-container-lowest border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 text-on-surface" 
                type="date" 
                defaultValue={searchParams?.get('start') || '2023-10-01'}
                onChange={(e) => handleDateChange('start', e.target.value)}
              />
            </div>
            <span className="text-outline text-center">até</span>
            <div className="flex-1 relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
              <input 
                className="w-full bg-surface-container-lowest border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 text-on-surface" 
                type="date" 
                defaultValue={searchParams?.get('end') || '2023-10-31'}
                onChange={(e) => handleDateChange('end', e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10 flex flex-col justify-between">
          <label className="text-[10px] uppercase tracking-widest text-outline mb-2 block">Fornecedor</label>
          <select 
            value={searchParams?.get('supplier') || 'Todos os Fornecedores'}
            onChange={(e) => handleFilterChange('Fornecedor', e.target.value)}
            className="w-full bg-surface-container-lowest border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 appearance-none text-on-surface"
          >
            <option>Todos os Fornecedores</option>
            {suppliers.map(s => (
              <option key={`filter-sup-${s}`} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10 flex flex-col justify-between">
          <label className="text-[10px] uppercase tracking-widest text-outline mb-2 block">Categoria</label>
          <select 
            value={searchParams?.get('category') || 'Todas as Categorias'}
            onChange={(e) => handleFilterChange('Categoria', e.target.value)}
            className="w-full bg-surface-container-lowest border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 appearance-none text-on-surface"
          >
            <option>Todas as Categorias</option>
            {filterCategories.map(c => (
              <option key={`filter-cat-${c}`} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Transaction Table */}
      <ExpenseTable 
        data={expenses} 
        onEdit={(exp) => {
          const amountStr = exp.amount || '';
          setEditingExpense({ ...exp, amount: amountStr.replace('R$ ', '') });
        }}
        onDelete={(id) => {
          deleteExpense(id);
          setToast({ message: 'Despesa excluída com sucesso!', type: 'success' });
        }}
      />

      {/* Edit Expense Modal */}
      <Modal 
        isOpen={!!editingExpense} 
        onClose={() => setEditingExpense(null)} 
        title="Editar Despesa"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-outline uppercase">Fornecedor</label>
            <input 
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm" 
              value={editingExpense?.supplier || ''}
              onChange={(e) => setEditingExpense({ ...editingExpense, supplier: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-outline uppercase">Projeto</label>
            <select 
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm" 
              value={editingExpense?.project || ''}
              onChange={(e) => setEditingExpense({ ...editingExpense, project: e.target.value })}
            >
              <option value="" disabled>Selecione um projeto</option>
              {projectNames.map(name => (
                <option key={`edit-proj-${name}`} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-outline uppercase">Valor (R$)</label>
            <input 
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm" 
              type="text"
              placeholder="0,00"
              value={editingExpense?.amount || ''}
              onChange={(e) => setEditingExpense({ ...editingExpense, amount: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-outline uppercase">Data do Pagamento</label>
              <input 
                className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm" 
                type="date"
                value={editingExpense?.date || ''}
                onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-outline uppercase">Data de Vencimento</label>
              <input 
                className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm" 
                type="date"
                value={editingExpense?.dueDate || ''}
                onChange={(e) => setEditingExpense({ ...editingExpense, dueDate: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-outline uppercase">Categoria</label>
            <select 
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm"
              value={editingExpense?.category || inputCategories[0]}
              onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value })}
            >
              {inputCategories.map(cat => (
                <option key={`edit-cat-${cat}`} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={handleUpdateExpense}
            className="w-full py-4 bg-primary text-on-primary font-bold rounded-2xl mt-4 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
          >
            Salvar Alterações
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-outline">Carregando Despesas...</div>}>
      <ExpensesContent />
    </Suspense>
  );
}
