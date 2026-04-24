'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useData } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function HighValueRecords() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { expenses } = useData();
  const activeFilter = (searchParams?.get('filter') as 'Fornecedor' | 'Categoria' | 'Descrição') || 'Fornecedor';
  const activeProjectParam = searchParams?.get('project');
  const activeProject = activeProjectParam && activeProjectParam !== 'undefined' ? activeProjectParam : 'Todos';

  const handleFilterChange = (filter: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('filter', filter);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Group and sort expenses based on active filter and project
  const records = React.useMemo(() => {
    const filteredExpenses = expenses.filter(exp => activeProject === 'Todos' || exp.project === activeProject);
    const grouped: Record<string, { entity: string, category: string, value: number }> = {};
    
    filteredExpenses.forEach(exp => {
      let key = '';
      if (activeFilter === 'Fornecedor') key = exp.supplier;
      else if (activeFilter === 'Categoria') key = exp.category;
      else key = exp.description;

      const amountStr = exp.amount || '0';
      const val = parseFloat(amountStr.replace('R$ ', '').replace('.', '').replace(',', '.'));
      
      if (grouped[key]) {
        grouped[key].value += val;
      } else {
        grouped[key] = {
          entity: key,
          category: exp.category,
          value: val
        };
      }
    });

    const totalFilteredValue = filteredExpenses.reduce((acc, curr) => {
      const amountStr = curr.amount || '0';
      return acc + parseFloat(amountStr.replace('R$ ', '').replace('.', '').replace(',', '.'));
    }, 0);

    return Object.values(grouped)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((rec, idx) => ({
        ...rec,
        value: `R$ ${rec.value.toLocaleString('pt-BR')}`,
        allocation: totalFilteredValue > 0 ? `${((rec.value / totalFilteredValue) * 100).toFixed(1)}%` : '0%',
        isPrimary: idx === 0
      }));
  }, [expenses, activeFilter, activeProject]);

  return (
    <div className="bg-surface-container-low rounded-3xl overflow-hidden shadow-2xl border border-outline-variant/10 flex flex-col">
      <div className="p-6 bg-surface-container border-b border-outline-variant/10">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="font-bold font-headline text-lg">Top 5 Registros {activeProject !== 'Todos' && ` - ${activeProject}`}</h3>
            <p className="text-outline text-xs mt-1">Principais impulsionadores de custos</p>
          </div>
          <div className="flex bg-surface-container-low p-1 rounded-xl w-fit border border-outline-variant/5">
            {['Fornecedor', 'Categoria', 'Descrição'].map((f) => (
              <button 
                key={f}
                onClick={() => handleFilterChange(f)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                  activeFilter === f ? "text-primary bg-surface-container-high shadow-sm" : "text-outline hover:text-on-surface"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead className="sticky top-0 bg-surface-container-low text-[10px] uppercase tracking-widest text-outline border-b border-outline-variant/10">
            <tr>
              <th className="px-6 py-4 font-bold">Entidade</th>
              <th className="px-6 py-4 font-bold text-right">Valor</th>
              <th className="px-6 py-4 font-bold text-right">% Alocação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5">
            {records.length > 0 ? (
              records.map((record, idx) => (
                <tr key={`${record.entity}-${idx}`} className="hover:bg-surface-container-high transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{record.entity}</span>
                      <span className="text-[10px] text-outline">{record.category}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-headline font-bold text-sm">{record.value}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-xs font-bold ${record.isPrimary ? 'text-primary' : 'text-outline'}`}>
                      {record.allocation}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-20 text-center">
                  <p className="text-outline text-sm font-medium">Nenhum registro encontrado para este filtro.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-surface-container-lowest text-center">
        <Link href="/expenses" className="text-xs font-bold text-primary hover:underline">
          Ver Todos os Registros
        </Link>
      </div>
    </div>
  );
}
