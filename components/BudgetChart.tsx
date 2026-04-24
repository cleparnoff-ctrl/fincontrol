'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import { useData } from '@/lib/store';
import { cn } from '@/lib/utils';

const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export default function BudgetChart() {
  const searchParams = useSearchParams();
  const { expenses, projects } = useData();
  const days = parseInt(searchParams?.get('days') || '30');
  const activeProjectParam = searchParams?.get('project');
  const activeProject = activeProjectParam && activeProjectParam !== 'undefined' ? activeProjectParam : 'Todos';
  const displayProject = activeProject === 'Todos' ? 'Geral' : activeProject;
  
  // Calculate dynamic data based on expenses and project
  const data = React.useMemo(() => {
    const now = new Date();
    const currentMonthIdx = now.getMonth();
    
    // Get last 6 months
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        month: months[d.getMonth()],
        monthIdx: d.getMonth(),
        year: d.getFullYear(),
        budget: 0,
        actual: 0,
        active: d.getMonth() === currentMonthIdx
      });
    }

    // Filter expenses by project
    const filteredExpenses = expenses.filter(exp => activeProject === 'Todos' || exp.project === activeProject);

    // Get project budget
    let totalBudget = 0;
    const parseCurrency = (val: string | number | undefined) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      const clean = val.toString().replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };

    if (activeProject === 'Todos') {
      totalBudget = projects.reduce((acc, curr) => acc + parseCurrency(curr.budgeted), 0);
    } else {
      const project = projects.find(p => p.title === activeProject);
      if (project) {
        totalBudget = parseCurrency(project.budgeted);
      }
    }

    // Distribute budget and calculate actuals
    const monthlyBudget = totalBudget / 12;

    const rawData = last6Months.map(m => {
      const monthActual = filteredExpenses
        .filter(exp => {
          const expDate = new Date(exp.date);
          return expDate.getMonth() === m.monthIdx && expDate.getFullYear() === m.year;
        })
        .reduce((acc, curr) => {
          return acc + parseCurrency(curr.amount);
        }, 0);

      let actualPercentage = monthlyBudget > 0 ? (monthActual / monthlyBudget) * 100 : 0;
      if (actualPercentage > 100) actualPercentage = 100;
      
      return {
        ...m,
        budgetPercentage: 100,
        actualPercentage: actualPercentage,
        monthActual
      };
    });

    // Dynamic Scaling: Find the max percentage to adjust Y-axis
    const maxPercentage = Math.max(100, ...rawData.map(d => d.actualPercentage));
    const yAxisMax = maxPercentage * 1.5; // Add 50% padding for labels

    return rawData.map(d => ({
      ...d,
      visualBudget: (100 / yAxisMax) * 100,
      visualActual: (d.actualPercentage / yAxisMax) * 100,
      realValue: `R$ ${d.monthActual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    }));
  }, [expenses, projects, activeProject]);

  return (
    <div className="bg-surface-container p-4 md:p-8 rounded-3xl border border-outline-variant/5 shadow-xl">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-12 gap-4">
        <div>
          <h3 className="text-lg md:text-xl font-bold font-headline mb-1">Orçamento vs. Real - {displayProject}</h3>
          <p className="text-outline text-xs md:text-sm">Acompanhamento mensal de despesas em relação às metas fiscais</p>
        </div>
        <div className="flex items-center gap-4 text-[10px] md:text-xs font-bold uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-surface-container-highest border border-outline-variant/20"></span>
            <span className="text-outline">Orçamento</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-primary shadow-[0_0_10px_rgba(78,222,163,0.4)]"></span>
            <span className="text-on-surface">Real</span>
          </div>
        </div>
      </div>

      <div className="h-80 w-full flex items-end justify-between gap-2 md:gap-4 pt-10">
        {data.map((item, index) => (
          <div key={`${item.month}-${index}`} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
            <div className="relative w-full flex justify-center items-end h-full max-w-[80px]">
              {/* Budget Bar (Background) */}
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end h-full">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${item.visualBudget}%` }}
                  transition={{ duration: 1, delay: index * 0.1 }}
                  className="w-full bg-surface-container-highest rounded-t-xl border border-outline-variant/10 transition-all group-hover:bg-surface-bright"
                />
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 1 }}
                  className="absolute -top-10 text-[7px] md:text-[8px] font-bold text-outline opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                >
                  Meta: 100%
                </motion.span>
              </div>
              
              {/* Actual Bar (Foreground) */}
              <div className="relative w-[60%] flex flex-col items-center justify-end h-full z-10">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${item.visualActual}%` }}
                  transition={{ duration: 1, delay: index * 0.1 + 0.2 }}
                  className={cn(
                    "w-full rounded-t-lg shadow-lg",
                    item.actualPercentage > 100 
                      ? "bg-gradient-to-t from-error to-error/80 shadow-error/20" 
                      : "bg-gradient-to-t from-primary/80 to-primary shadow-primary/20"
                  )}
                />
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 1.2 }}
                  className={cn(
                    "absolute -top-5 text-[8px] md:text-[10px] font-black whitespace-nowrap drop-shadow-sm",
                    item.actualPercentage > 100 ? "text-error" : "text-primary"
                  )}
                >
                  {Math.round(item.actualPercentage)}%
                </motion.span>
              </div>
            </div>
            <span className={`text-[10px] font-bold mt-3 ${item.active ? 'text-primary' : 'text-outline'}`}>
              {item.month}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
