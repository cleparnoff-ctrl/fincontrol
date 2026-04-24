'use client';

import React, { Suspense } from 'react';
import { Calendar, ChevronDown, Filter as FilterIcon, Download } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import MetricCard from '@/components/MetricCard';
import BudgetChart from '@/components/BudgetChart';
import HighValueRecords from '@/components/HighValueRecords';
import AnalyticsCards from '@/components/AnalyticsCards';
import Modal from '@/components/Modal';
import { useData } from '@/lib/store';

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { expenses, projects } = useData();
  const query = searchParams?.get('q')?.toLowerCase() || '';
  const activeProjectParam = searchParams?.get('project');
  const activeProject = activeProjectParam && activeProjectParam !== 'undefined' ? activeProjectParam : 'Todos';
  
  const [isDateModalOpen, setIsDateModalOpen] = React.useState(false);
  const [isProjectFilterOpen, setIsProjectFilterOpen] = React.useState(false);

  const projectTitles = React.useMemo(() => {
    return Array.from(new Set(projects.map(p => p.title))).filter(Boolean).sort();
  }, [projects]);

  // Filter expenses based on project and search query
  const filteredExpenses = React.useMemo(() => {
    return expenses.filter(exp => {
      const matchesProject = activeProject === 'Todos' || exp.project === activeProject;
      const matchesQuery = !query || 
        (exp.supplier || '').toLowerCase().includes(query) || 
        (exp.description || '').toLowerCase().includes(query) || 
        (exp.category || '').toLowerCase().includes(query);
      return matchesProject && matchesQuery;
    });
  }, [expenses, activeProject, query]);

  // Calculate real metrics from filtered expenses
  const metrics = React.useMemo(() => {
    const parseCurrency = (val: string | number | undefined) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      // Remove 'R$', spaces, thousands separator (.), and replace decimal comma (,) with dot
      const clean = val.toString().replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };

    let totalSpent = 0;
    let budget = 0;

    // Orçamento Total: soma do campo budgeted de todos os projetos (ou do selecionado)
    if (activeProject === 'Todos') {
      budget = projects.reduce((acc, curr) => acc + parseCurrency(curr.budgeted), 0);
      // Total Gasto: soma do campo amount de todos os lançamentos
      totalSpent = expenses.reduce((acc, curr) => acc + parseCurrency(curr.amount), 0);
    } else {
      const project = projects.find(p => p.title === activeProject);
      if (project) {
        budget = parseCurrency(project.budgeted);
      }
      // Total Gasto para o projeto selecionado
      totalSpent = expenses
        .filter(exp => exp.project === activeProject)
        .reduce((acc, curr) => acc + parseCurrency(curr.amount), 0);
    }

    const variance = budget - totalSpent;
    const progress = budget > 0 ? (totalSpent / budget) * 100 : 0;

    return {
      totalSpent: `R$ ${totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      budget: `R$ ${budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      variance: `${variance < 0 ? '-' : ''}R$ ${Math.abs(variance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      progress: progress,
      isOverBudget: totalSpent > budget
    };
  }, [expenses, activeProject, projects]);

  const handleProjectFilter = (project: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (project === 'Todos') params.delete('project');
    else params.set('project', project);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleDateFilter = (range: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('days', range);
    router.replace(`${pathname}?${params.toString()}`);
    setIsDateModalOpen(false);
  };

  return (
    <div className="animate-in fade-in duration-700" id="dashboard-container">
      {/* Header Section & Quick Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div className="text-center md:text-left">
          <span className="text-primary font-semibold tracking-widest text-[10px] uppercase mb-1 block">Visão Geral Global</span>
          <h1 className="text-3xl md:text-4xl font-extrabold font-headline tracking-tighter text-on-surface">Dashboard Executivo</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Project Dropdown Filter */}
          <div className="relative w-full sm:w-auto">
            <button 
              onClick={() => setIsProjectFilterOpen(!isProjectFilterOpen)}
              className="flex items-center gap-2 px-4 py-3 bg-surface-container text-on-surface text-xs font-bold rounded-xl border border-outline-variant/10 hover:border-primary/30 transition-all w-full sm:min-w-[200px] justify-between shadow-sm"
            >
              <div className="flex items-center gap-2">
                <FilterIcon className="w-3.5 h-3.5 text-primary" />
                <span>{activeProject === 'Todos' ? 'Todos os Projetos' : activeProject}</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-outline transition-transform", isProjectFilterOpen && "rotate-180")} />
            </button>

            {isProjectFilterOpen && (
              <>
                <div 
                  className="fixed inset-0 z-[100]" 
                  onClick={() => setIsProjectFilterOpen(false)}
                />
                <div className="absolute top-full left-0 mt-2 w-full bg-surface-container-high border border-outline-variant/20 rounded-2xl shadow-2xl z-[101] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="max-h-[300px] overflow-y-auto py-2 no-scrollbar">
                    <button
                      onClick={() => {
                        handleProjectFilter('Todos');
                        setIsProjectFilterOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-3 text-xs font-bold transition-colors hover:bg-primary/10",
                        activeProject === 'Todos' ? "text-primary bg-primary/5" : "text-on-surface-variant"
                      )}
                    >
                      Todos os Projetos
                    </button>
                    {projectTitles.map((title) => (
                      <button
                        key={title}
                        onClick={() => {
                          handleProjectFilter(title);
                          setIsProjectFilterOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 text-xs font-bold transition-colors hover:bg-primary/10",
                          activeProject === title ? "text-primary bg-primary/5" : "text-on-surface-variant"
                        )}
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <button 
            onClick={() => setIsDateModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-surface-container text-on-surface text-xs font-bold rounded-xl border border-outline-variant/10 hover:border-primary/30 transition-all shadow-sm w-full sm:w-auto"
          >
            <Calendar className="w-4 h-4 text-primary" />
            <span>Últimos {searchParams?.get('days') || '30'} Dias</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <Modal 
        isOpen={isDateModalOpen} 
        onClose={() => setIsDateModalOpen(false)} 
        title="Selecionar Período do Dashboard"
      >
        <div className="space-y-4">
          <p className="text-outline text-sm">Escolha o intervalo de tempo para visualizar as métricas executivas.</p>
          <div className="grid grid-cols-3 gap-3">
            {[7, 30, 90, 180, 365].map(days => (
              <button 
                key={days}
                onClick={() => handleDateFilter(days.toString())}
                className={cn(
                  "py-3 rounded-xl border font-bold text-sm transition-all",
                  (searchParams?.get('days') || '30') === days.toString() 
                    ? "bg-primary text-on-primary border-primary" 
                    : "bg-surface-container-high border-outline-variant/10 hover:border-primary/30"
                )}
              >
                {days} Dias
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {query && (
        <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-2xl text-primary text-sm">
          Filtrando resultados para: <strong>&quot;{query}&quot;</strong>
        </div>
      )}

      {/* Main Section: Chart, Metrics & Table */}
      <div className="space-y-8 mb-10">
        {/* Row 1: Budget Chart & Primary Metrics */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3">
            <BudgetChart />
          </div>
          <div className="xl:col-span-1 flex flex-col gap-4">
            <MetricCard 
              title="Orçamento Total" 
              value={metrics.budget} 
              trend={{ value: "+12% vs ano ant.", isUp: true }} 
            />
            <MetricCard 
              title="Total Gasto" 
              value={metrics.totalSpent} 
              progress={metrics.progress} 
              progressLabel={metrics.isOverBudget ? "ALERTA" : `${metrics.progress.toFixed(0)}% utilizado`} 
            />
            <MetricCard 
              title="Variância" 
              value={metrics.variance} 
              trend={{ 
                value: metrics.isOverBudget ? "Acima" : "Abaixo", 
                isUp: !metrics.isOverBudget 
              }} 
            />
          </div>
        </div>

        {/* Row 2: Top Records & Analytics Cards */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-2">
            <HighValueRecords />
          </div>
          <div className="xl:col-span-2">
            <AnalyticsCards />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-outline">Carregando Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
