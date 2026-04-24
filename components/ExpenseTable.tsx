'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Cloud, 
  Megaphone, 
  AlertTriangle, 
  Truck, 
  Terminal, 
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function ExpenseTable({ 
  data, 
  onEdit, 
  onDelete 
}: { 
  data?: any[], 
  onEdit?: (expense: any) => void,
  onDelete?: (id: string) => void
}) {
  const searchParams = useSearchParams();
  const query = searchParams?.get('q')?.toLowerCase() || '';
  const supplierFilter = searchParams?.get('supplier') || 'Todos os Fornecedores';
  const categoryFilter = searchParams?.get('category') || 'Todas as Categorias';

  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [sortConfig, setSortConfig] = React.useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredExpenses = React.useMemo(() => {
    const expensesToFilter = data || [];
    let result = expensesToFilter.filter(expense => {
      const matchesQuery = (expense.supplier || '').toLowerCase().includes(query) ||
        (expense.description || '').toLowerCase().includes(query) ||
        (expense.project || '').toLowerCase().includes(query) ||
        (expense.category || '').toLowerCase().includes(query);
      
      const matchesSupplier = supplierFilter === 'Todos os Fornecedores' || expense.supplier === supplierFilter;
      const matchesCategory = categoryFilter === 'Todas as Categorias' || expense.category === categoryFilter;

      // Real date range check
      const startDate = searchParams?.get('start');
      const endDate = searchParams?.get('end');
      let matchesDate = true;
      
      if (startDate || endDate) {
        const expenseDate = new Date(expense.date);
        if (startDate) {
          const start = new Date(startDate);
          if (expenseDate < start) matchesDate = false;
        }
        if (endDate) {
          const end = new Date(endDate);
          if (expenseDate > end) matchesDate = false;
        }
      }

      return matchesQuery && matchesSupplier && matchesCategory && matchesDate;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle special cases like amount and dates
        if (sortConfig.key === 'amount') {
          aValue = parseFloat(a.amount.replace('R$ ', '').replace('.', '').replace(',', '.'));
          bValue = parseFloat(b.amount.replace('R$ ', '').replace('.', '').replace(',', '.'));
        } else if (sortConfig.key === 'date' || sortConfig.key === 'dueDate') {
          aValue = new Date(a[sortConfig.key]).getTime();
          bValue = new Date(b[sortConfig.key]).getTime();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, query, supplierFilter, categoryFilter, searchParams, sortConfig]);

  return (
    <div className="bg-surface-container rounded-3xl overflow-hidden border border-outline-variant/10 shadow-2xl">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high/50 text-outline text-[11px] uppercase tracking-[0.15em] font-bold">
              <th 
                className="px-6 py-5 cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center">
                  Data do Pagamento
                  {sortConfig?.key === 'date' && (
                    sortConfig.direction === 'asc' ? <ChevronDown className="w-3 h-3 ml-1 rotate-180" /> : <ChevronDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-5 cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort('dueDate')}
              >
                <div className="flex items-center">
                  Data de Vencimento
                  {sortConfig?.key === 'dueDate' && (
                    sortConfig.direction === 'asc' ? <ChevronDown className="w-3 h-3 ml-1 rotate-180" /> : <ChevronDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-5 cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort('supplier')}
              >
                <div className="flex items-center">
                  Fornecedor
                  {sortConfig?.key === 'supplier' && (
                    sortConfig.direction === 'asc' ? <ChevronDown className="w-3 h-3 ml-1 rotate-180" /> : <ChevronDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-5 cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort('description')}
              >
                <div className="flex items-center">
                  Item / Descrição
                  {sortConfig?.key === 'description' && (
                    sortConfig.direction === 'asc' ? <ChevronDown className="w-3 h-3 ml-1 rotate-180" /> : <ChevronDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-5 cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort('project')}
              >
                <div className="flex items-center">
                  Projeto
                  {sortConfig?.key === 'project' && (
                    sortConfig.direction === 'asc' ? <ChevronDown className="w-3 h-3 ml-1 rotate-180" /> : <ChevronDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-5 cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center">
                  Categoria
                  {sortConfig?.key === 'category' && (
                    sortConfig.direction === 'asc' ? <ChevronDown className="w-3 h-3 ml-1 rotate-180" /> : <ChevronDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-5 text-right cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center justify-end">
                  Valor
                  {sortConfig?.key === 'amount' && (
                    sortConfig.direction === 'asc' ? <ChevronDown className="w-3 h-3 ml-1 rotate-180" /> : <ChevronDown className="w-3 h-3 ml-1" />
                  )}
                </div>
              </th>
              <th className="px-6 py-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {filteredExpenses.length > 0 ? filteredExpenses.map((expense, idx) => (
              <tr 
                key={expense.id || `expense-${idx}`} 
                className={cn(
                  "hover:bg-surface-bright/30 transition-colors group",
                  expense.status === 'error' && "border-l-4 border-l-error/40"
                )}
              >
                <td className="px-6 py-5 text-sm font-medium text-on-surface-variant">{expense.date}</td>
                <td className="px-6 py-5 text-sm font-medium text-on-surface-variant">{expense.dueDate}</td>
                <td className="px-6 py-5">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center mr-3 border border-outline-variant/10">
                      {expense.icon ? (
                        <expense.icon className={cn("w-4 h-4", expense.iconColor)} />
                      ) : (
                        <Cloud className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <span className="text-sm font-semibold">{expense.supplier}</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm text-outline group-hover:text-on-surface-variant transition-colors">
                  {expense.description}
                </td>
                <td className="px-6 py-5">
                  <span className="px-2.5 py-1 rounded-full bg-secondary-container/30 text-secondary text-[10px] font-bold uppercase tracking-wider">
                    {expense.project}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center">
                    <div className={cn(
                      "w-2 h-2 rounded-full mr-2",
                      expense.status === 'error' ? "bg-error" : "bg-primary"
                    )} />
                    <span className={cn("text-sm", expense.status === 'error' && "text-error")}>
                      {expense.category}
                    </span>
                  </div>
                </td>
                <td className={cn(
                  "px-6 py-5 text-right font-headline font-bold",
                  expense.status === 'error' ? "text-error" : "text-on-surface"
                )}>
                  {expense.amount}
                </td>
                <td className="px-6 py-5 text-right relative">
                  <button 
                    onClick={() => setOpenMenuId(openMenuId === expense.id ? null : expense.id)}
                    className="p-1 hover:bg-surface-variant rounded transition-colors text-outline"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  
                  {openMenuId === expense.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div className="absolute right-6 top-12 w-36 bg-surface-container-highest border border-outline-variant/20 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <button 
                          onClick={() => {
                            onEdit?.(expense);
                            setOpenMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-primary/10 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-primary" />
                          Editar
                        </button>
                        <button 
                          onClick={() => {
                            onDelete?.(expense.id);
                            setOpenMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-error hover:bg-error/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Excluir
                        </button>
                      </div>
                    </>
                  )}
                </td>
              </tr>
            )) : (
              <tr key="empty-state">
                <td colSpan={7} className="px-6 py-10 text-center text-outline italic">
                  Nenhum registro encontrado para &quot;{query}&quot;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile View: Cards */}
      <div className="md:hidden divide-y divide-outline-variant/10">
        {filteredExpenses.length > 0 ? filteredExpenses.map((expense, idx) => (
          <div key={expense.id || `mobile-expense-${idx}`} className="p-4 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center mr-3 border border-outline-variant/10">
                  <Cloud className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface">{expense.supplier}</p>
                  <div className="flex gap-2">
                    <p className="text-[9px] text-outline uppercase tracking-wider">PAG: {expense.date}</p>
                    <p className="text-[9px] text-primary uppercase tracking-wider font-bold">VENC: {expense.dueDate}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-on-surface">{expense.amount}</p>
                <button 
                  onClick={() => setOpenMenuId(openMenuId === expense.id ? null : expense.id)}
                  className="p-1 text-outline"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-0.5 rounded-full bg-secondary-container/30 text-secondary text-[9px] font-bold uppercase tracking-wider">
                {expense.project}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider">
                {expense.category}
              </span>
            </div>
            <p className="text-xs text-outline line-clamp-1">{expense.description}</p>
            
            {openMenuId === expense.id && (
              <div className="flex gap-2 mt-1">
                <button 
                  onClick={() => {
                    onEdit?.(expense);
                    setOpenMenuId(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary/10 text-primary text-[10px] font-bold rounded-lg"
                >
                  <Edit2 className="w-3 h-3" /> Editar
                </button>
                <button 
                  onClick={() => {
                    onDelete?.(expense.id);
                    setOpenMenuId(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-error/10 text-error text-[10px] font-bold rounded-lg"
                >
                  <Trash2 className="w-3 h-3" /> Excluir
                </button>
              </div>
            )}
          </div>
        )) : (
          <div className="p-10 text-center text-outline italic text-sm">
            Nenhum registro encontrado.
          </div>
        )}
      </div>
      
      {/* Table Footer / Pagination */}
      <div className="bg-surface-container-low px-6 py-4 flex items-center justify-between border-t border-outline-variant/10">
        <div className="text-xs text-outline font-medium">
          Mostrando <span className="text-on-surface-variant">1-{filteredExpenses.length}</span> de <span className="text-on-surface-variant">{filteredExpenses.length}</span> transações
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg text-outline hover:bg-surface-variant disabled:opacity-30" disabled>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-lg bg-primary text-on-primary text-xs font-bold">1</button>
          <button className="w-8 h-8 rounded-lg text-outline hover:bg-surface-variant text-xs font-bold">2</button>
          <button className="w-8 h-8 rounded-lg text-outline hover:bg-surface-variant text-xs font-bold">3</button>
          <span className="px-2 text-outline">...</span>
          <button className="w-8 h-8 rounded-lg text-outline hover:bg-surface-variant text-xs font-bold">29</button>
          <button className="p-2 rounded-lg text-outline hover:bg-surface-variant">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
