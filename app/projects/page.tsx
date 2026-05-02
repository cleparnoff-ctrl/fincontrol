'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { Search, Filter, Download, Plus } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import ProjectCard from '@/components/ProjectCard';
import Modal from '@/components/Modal';
import { useData } from '@/lib/store';
import { doc, getDocFromServer, getDocsFromServer, collection, query, where } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { Project } from '@/lib/store';

function ProjectsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryParam = searchParams?.get('q')?.toLowerCase() || '';
  const statusFilter = searchParams?.get('status') || 'Todos os Status';
  const managerFilter = searchParams?.get('manager') || 'Todos os Gerentes';
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(searchParams?.get('new') === 'true');
  const [editingProject, setEditingProject] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const { projects, expenses, addProject, updateProject, deleteProject } = useData();

  useEffect(() => {
    const loadProjects = async () => {
      if (auth.currentUser?.uid) {
        try {
          // Aba Projetos: Deve buscar da coleção 'projects'
          const q = query(collection(db, 'projects'), where('userId', '==', auth.currentUser.uid));
          await getDocsFromServer(q);
        } catch (err) {
          console.error("Erro ao carregar projetos no mount:", err);
        }
      }
    };
    loadProjects();
  }, []);

  const managers = Array.from(new Set(projects.map(p => p.manager))).filter(Boolean).sort();

  useEffect(() => {
    if (searchParams?.get('new') === 'true') {
      // Clean up the URL
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.delete('new');
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [searchParams, pathname, router]);

  const [newProject, setNewProject] = useState({
    title: '',
    manager: '',
    budgeted: '',
    date: ''
  });

  const handleCreateProject = async () => {
    if (!newProject.title || !newProject.manager || !newProject.budgeted) {
      alert('Por favor, preencha o nome, gerente e orçamento do projeto.');
      return;
    }

    // --- INÍCIO DA TRAVA DE PLANO SAAS ---
    if (auth.currentUser?.uid) {
      try {
        // Busca os dados da empresa atrelada a este usuário no banco
        const qCompany = query(collection(db, 'companies'), where('userId', '==', auth.currentUser.uid));
        const companySnapshot = await getDocsFromServer(qCompany);
        
        if (!companySnapshot.empty) {
          const companyData = companySnapshot.docs[0].data();
          
          // A REGRA DE NEGÓCIO: Se for plano 'start' e já tiver 3 projetos, bloqueia!
          if (companyData.plan_name === 'start' && projects.length >= 3) {
            alert('Você atingiu o limite de 3 projetos do plano Start. Faça o upgrade para o Business para criar projetos ilimitados.');
            return; // O 'return' encerra a função aqui e não deixa o código continuar
          }
        }
      } catch (err) {
        console.error("Erro ao validar plano SaaS:", err);
        setToast({ message: 'Erro ao validar sua assinatura.', type: 'error' });
        return;
      }
    }
    // --- FIM DA TRAVA DE PLANO SAAS ---

    const budgeted = parseFloat(newProject.budgeted.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.') || '0');

    const projectData = {
      title: newProject.title,
      manager: newProject.manager,
      description: 'Novo projeto estratégico adicionado recentemente.',
      budgeted: budgeted,
      spent: 0,
      remaining: budgeted,
      progress: 0,
      status: 'on-track' as const,
    };

    try {
      console.log('Criando novo projeto:', projectData);
      await addProject(projectData);
      setToast({ message: 'Projeto criado com sucesso!', type: 'success' });
      setIsNewProjectOpen(false);
      setNewProject({ title: '', manager: '', budgeted: '', date: '' });
    } catch (err: any) {
      if (err.message === 'DUPLICATE_NAME') {
        alert('Este nome de projeto já está em uso.');
      } else {
        console.error('Erro ao criar projeto:', err);
        setToast({ message: `Erro ao criar projeto: ${err.message}`, type: 'error' });
      }
    }
  };

  const handleCleanupDuplicates = async () => {
    const seen = new Map<string, string>(); // title -> id
    const toDelete: string[] = [];

    projects.forEach(p => {
      if (seen.has(p.title)) {
        toDelete.push(p.id);
      } else {
        seen.set(p.title, p.id);
      }
    });

    if (toDelete.length === 0) {
      setToast({ message: 'Nenhuma duplicata encontrada.', type: 'success' });
      return;
    }

    if (confirm(`Encontrados ${toDelete.length} projetos duplicados. Deseja remover e manter apenas um de cada?`)) {
      try {
        for (const id of toDelete) {
          await deleteProject(id);
        }
        setToast({ message: 'Duplicatas removidas com sucesso!', type: 'success' });
      } catch (err) {
        console.error('Erro ao remover duplicatas:', err);
        setToast({ message: 'Erro ao remover duplicatas.', type: 'error' });
      }
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !editingProject.id || !editingProject.title || !editingProject.manager) {
      setToast({ message: 'Erro: Preencha todos os campos obrigatórios.', type: 'error' });
      return;
    }

    const budgeted = (typeof editingProject.budgeted === 'number')
      ? editingProject.budgeted
      : parseFloat(editingProject.budgeted.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.') || '0');

    const projectExpenses = expenses.filter(e => e.project === editingProject.title);
    const totalSpent = projectExpenses.reduce((acc, curr) => {
      const amount = parseFloat(curr.amount.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.') || '0');
      return acc + amount;
    }, 0);

    const projectData = {
      ...editingProject,
      budgeted: budgeted,
      spent: totalSpent,
      remaining: budgeted - totalSpent,
    };

    try {
      console.log('Atualizando projeto:', editingProject.id, projectData);
      await updateProject(editingProject.id, projectData);
      setToast({ message: 'Projeto atualizado com sucesso!', type: 'success' });
      setEditingProject(null);
      router.refresh(); 
    } catch (err: any) {
      console.error('Erro ao atualizar projeto no Firestore:', err);
      if (err.message === 'DUPLICATE_NAME') {
        alert('Este nome de projeto já está em uso.');
      } else {
        setToast({ message: `Erro ao atualizar projeto: ${err.message}`, type: 'error' });
      }
    }
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const numberValue = parseInt(numbers, 10) / 100;
    if (isNaN(numberValue)) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numberValue);
  };

  const formatCurrencyForDisplay = (value: string | number) => {
    const numValue = typeof value === 'string' 
      ? parseFloat(value.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.') || '0')
      : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  };

  const handleBudgetedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEditingProject({ ...editingProject, budgeted: value });
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    setToast({ message: 'Projeto excluído com sucesso!', type: 'success' });
  };

  const filteredProjects = projects.filter(p => {
    const matchesQuery = (p.title || '').toLowerCase().includes(queryParam) || 
      (p.manager || '').toLowerCase().includes(queryParam) ||
      (p.description || '').toLowerCase().includes(queryParam);
    
    const matchesStatus = statusFilter === 'Todos os Status' || 
      (statusFilter === 'No Prazo' && p.status === 'on-track') ||
      (statusFilter === 'Aviso' && p.status === 'warning') ||
      (statusFilter === 'Acima do Orçamento' && p.status === 'over-budget');

    const matchesManager = managerFilter === 'Todos os Gerentes' || p.manager === managerFilter;

    return matchesQuery && matchesStatus && matchesManager;
  });

  const handleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const handleFilterChange = (type: 'status' | 'manager', val: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (val.includes('Todos')) params.delete(type);
    else params.set(type, val);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleSearchChange = (val: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (val) params.set('q', val);
    else params.delete('q');
    router.replace(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <div className="animate-in fade-in slide-in-from-left-4 duration-700">
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
          <span className="text-primary text-xs font-bold uppercase tracking-[0.2em]">Portfólio de Projetos</span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mt-2">Iniciativas Ativas</h1>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-4 w-full">
          <button 
            onClick={handleCleanupDuplicates}
            className="col-span-2 sm:flex-none bg-surface-container-high text-on-surface px-6 py-3 rounded-xl flex items-center justify-center gap-2 border border-outline-variant/20 hover:bg-surface-bright transition-all font-bold text-sm active:scale-95 whitespace-nowrap"
          >
            Limpar Duplicatas
          </button>
          <button 
            onClick={() => setIsNewProjectOpen(true)}
            className="col-span-2 sm:flex-none bg-gradient-to-br from-primary to-on-primary-container text-on-primary px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/10 hover:brightness-110 transition-all font-bold text-sm active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Novo Projeto
          </button>
          <div className="relative col-span-2 sm:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
            <input 
              className="bg-surface-container-lowest border-none focus:ring-0 focus:border-b-2 focus:border-primary text-sm pl-10 pr-4 py-3 rounded-xl w-full text-on-surface" 
              placeholder="Buscar projetos..." 
              type="text"
              defaultValue={queryParam}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <button 
            onClick={handleFilter}
            className={cn(
              "col-span-2 sm:flex-none px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all border",
              isFilterOpen ? "bg-primary text-on-primary border-primary" : "bg-surface-container-high border-primary/15 hover:bg-surface-bright"
            )}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filtrar</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <Modal 
        isOpen={isNewProjectOpen} 
        onClose={() => setIsNewProjectOpen(false)} 
        title="Novo Projeto Estratégico"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-outline uppercase">Nome do Projeto</label>
            <input 
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm" 
              placeholder="Ex: Expansão Global" 
              value={newProject.title}
              onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-outline uppercase">Gerente Responsável</label>
            <input 
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm" 
              placeholder="Nome do gerente" 
              value={newProject.manager}
              onChange={(e) => setNewProject({ ...newProject, manager: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-outline uppercase">Orçamento (R$)</label>
              <input 
                className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm" 
                placeholder="0,00" 
                value={newProject.budgeted}
                onChange={(e) => setNewProject({ ...newProject, budgeted: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-outline uppercase">Prazo Estimado</label>
              <input 
                className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm" 
                type="date" 
                value={newProject.date}
                onChange={(e) => setNewProject({ ...newProject, date: e.target.value })}
              />
            </div>
          </div>
          <button 
            onClick={handleCreateProject}
            className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl mt-4"
          >
            Criar Projeto
          </button>
        </div>
      </Modal>

      {isFilterOpen && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="mb-8 p-6 bg-surface-container-low rounded-2xl border border-primary/10 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-widest mb-2 block">Status</label>
            <select 
              value={statusFilter}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full bg-surface-container-lowest border-none rounded-lg px-4 py-2 text-sm text-on-surface"
            >
              <option>Todos os Status</option>
              <option>No Prazo</option>
              <option>Aviso</option>
              <option>Acima do Orçamento</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-widest mb-2 block">Gerente</label>
            <select 
              value={managerFilter}
              onChange={(e) => handleFilterChange('manager', e.target.value)}
              className="w-full bg-surface-container-lowest border-none rounded-lg px-4 py-2 text-sm text-on-surface"
            >
              <option>Todos os Gerentes</option>
              {managers.map(manager => (
                <option key={manager} value={manager}>{manager}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button 
              onClick={() => setIsFilterOpen(false)}
              className="w-full py-2 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-colors"
            >
              Fechar Filtros
            </button>
          </div>
        </motion.div>
      )}

      {/* Edit Project Modal */}
      <Modal 
        isOpen={!!editingProject} 
        onClose={() => setEditingProject(null)} 
        title="Editar Projeto Estratégico"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-outline uppercase">Nome do Projeto</label>
            <input 
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm" 
              value={editingProject?.title || ''}
              onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-outline uppercase">Gerente Responsável</label>
            <input 
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm" 
              value={editingProject?.manager || ''}
              onChange={(e) => setEditingProject({ ...editingProject, manager: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-outline uppercase">Orçamento (R$)</label>
              <input 
                className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm font-medium" 
                value={editingProject?.budgeted || ''}
                onChange={handleBudgetedChange}
                placeholder="R$ 0,00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-outline uppercase">Progresso (%)</label>
              <input 
                className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm" 
                type="number"
                min="0"
                max="100"
                value={editingProject?.progress || 0}
                onChange={(e) => setEditingProject({ ...editingProject, progress: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-outline uppercase">Status</label>
            <select 
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-3 text-sm"
              value={editingProject?.status || 'on-track'}
              onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value })}
            >
              <option value="on-track">No Prazo</option>
              <option value="warning">Aviso</option>
              <option value="over-budget">Acima do Orçamento</option>
            </select>
          </div>
          <button 
            onClick={handleUpdateProject}
            className="w-full py-4 bg-primary text-on-primary font-bold rounded-2xl mt-4 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
          >
            Salvar Alterações
          </button>
        </div>
      </Modal>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProjects.length > 0 ? filteredProjects.map((project) => (
          <ProjectCard 
            key={project.id}
            {...project}
            onEdit={() => setEditingProject(project)}
            onDelete={() => handleDeleteProject(project.id)}
          />
        )) : (
          <div className="lg:col-span-12 py-20 text-center bg-surface-container-low rounded-3xl border border-dashed border-outline-variant/30">
            <p className="text-outline italic">Nenhum projeto encontrado para &quot;{queryParam}&quot;</p>
          </div>
        )}
      </div>

      {/* Section: Data Table for Detailed Review */}
      <div className="mt-12 bg-surface-container-low rounded-[1.5rem] overflow-hidden border border-outline-variant/5">
        <div className="px-8 py-6 border-b border-outline-variant/10 flex justify-between items-center">
          <h3 className="text-xl font-bold">Auditoria Abrangente de Portfólio</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-lowest text-outline text-xs uppercase tracking-widest">
              <tr>
                <th className="px-8 py-4 font-semibold">Entidade do Projeto</th>
                <th className="px-8 py-4 font-semibold">Liderança</th>
                <th className="px-8 py-4 font-semibold">Saúde Fiscal</th>
                <th className="px-8 py-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filteredProjects.length > 0 ? filteredProjects.slice(0, 5).map((project) => {
                const projectExpenses = expenses.filter(e => e.project === project.title);
                const spent = projectExpenses.reduce((acc, curr) => {
                  const amount = parseFloat(curr.amount.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.') || '0');
                  return acc + amount;
                }, 0);
                return (
                  <tr key={`audit-${project.id}`} className="hover:bg-surface-container-highest/30 transition-colors">
                    <td className="px-8 py-6">
                      <p className="font-bold text-on-surface">{project.title}</p>
                      <p className="text-xs text-outline mt-1">ID: #{project.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-8 py-6 text-sm">{project.manager}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{formatCurrencyForDisplay(spent)}</span>
                        <div className="w-20 h-1 bg-surface-container-highest rounded-full">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              project.status === 'over-budget' ? "bg-error" : "bg-primary"
                            )} 
                            style={{ width: `${Math.min(100, project.progress)}%` }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className={cn(
                        "text-[10px] font-bold px-3 py-1 rounded-full uppercase",
                        project.status === 'on-track' ? "bg-primary-container text-primary" :
                        project.status === 'warning' ? "bg-tertiary-container text-tertiary" :
                        "bg-error-container text-error"
                      )}>
                        {project.status === 'on-track' ? 'No Prazo' : project.status === 'warning' ? 'Aviso' : 'Crítico'}
                      </span>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={4} className="px-8 py-10 text-center text-outline italic">
                    Nenhum projeto para auditoria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-outline">Carregando Projetos...</div>}>
      <ProjectsContent />
    </Suspense>
  );
}