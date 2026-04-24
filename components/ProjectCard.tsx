'use client';

import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, Search, Filter, Download, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

import Modal from './Modal';

import { useData } from '@/lib/store';

interface ProjectCardProps {
  id: string;
  title: string;
  description: string;
  manager: string;
  budgeted: string | number;
  progress: number;
  status: 'on-track' | 'over-budget' | 'pending' | 'warning';
  size?: 'large' | 'small';
  onEdit?: () => void;
  onDelete?: () => void;
}

const formatCurrency = (value: string | number) => {
  const numValue = typeof value === 'string' 
    ? parseFloat(value.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.') || '0')
    : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue);
};

export default function ProjectCard({ 
  id,
  title, 
  description, 
  manager, 
  budgeted, 
  progress, 
  status,
  onEdit,
  onDelete
}: ProjectCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  const { expenses } = useData();

  // Dynamic calculations
  const projectExpenses = expenses.filter(e => e.project === title);
  const totalSpent = projectExpenses.reduce((acc, curr) => {
    const amountVal = typeof curr.amount === 'number' ? curr.amount : (parseFloat(curr.amount.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.') || '0'));
    return acc + amountVal;
  }, 0);
  const budgetValue = typeof budgeted === 'number' ? budgeted : parseFloat(budgeted.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.') || '0');
  const remaining = budgetValue - totalSpent;

  const statusConfig = {
    'on-track': { label: 'No Prazo', color: 'text-primary', bg: 'bg-primary/10', icon: CheckCircle2 },
    'warning': { label: 'Aviso', color: 'text-tertiary', bg: 'bg-tertiary/10', icon: AlertTriangle },
    'over-budget': { label: 'Crítico', color: 'text-error', bg: 'bg-error/10', icon: AlertTriangle },
    'pending': { label: 'Pendente', color: 'text-outline', bg: 'bg-surface-variant', icon: Clock }
  };

  const config = statusConfig[status] || statusConfig['pending'];
  const StatusIcon = config.icon;

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "lg:col-span-4 bg-surface-container-low rounded-[2rem] p-6 hover:bg-surface-container-high transition-all border border-outline-variant/10 group relative flex flex-col justify-between shadow-sm hover:shadow-xl duration-300",
          status === 'over-budget' && "border-error/30 shadow-lg shadow-error/5"
        )}
      >
        <div>
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest", config.bg, config.color)}>
                  {config.label}
                </span>
                <span className="text-[9px] font-bold text-outline/50 uppercase tracking-widest">ID: {id}</span>
              </div>
              <h3 className="font-bold text-xl tracking-tight text-on-surface group-hover:text-primary transition-colors line-clamp-1">{title}</h3>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={onEdit} className="p-1.5 hover:bg-surface-container-highest rounded-md transition-colors text-outline hover:text-primary">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={onDelete} className="p-1.5 hover:bg-error/10 rounded-md transition-colors text-outline hover:text-error">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-surface-container-lowest/50 rounded-xl border border-outline-variant/5">
                <p className="text-[9px] text-outline uppercase tracking-widest font-bold mb-1">Gasto</p>
                <p className="text-sm font-black text-on-surface">{formatCurrency(totalSpent)}</p>
              </div>
              <div className="p-3 bg-surface-container-lowest/50 rounded-xl border border-outline-variant/5 text-right">
                <p className="text-[9px] text-outline uppercase tracking-widest font-bold mb-1">Restante</p>
                <p className="text-sm font-black text-primary">{formatCurrency(remaining)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className="text-outline">Progresso de Execução</span>
                <span className={cn("font-headline", config.color)}>{progress}%</span>
              </div>
              <div className="h-2.5 w-full bg-surface-container-highest rounded-full overflow-hidden p-0.5 border border-outline-variant/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full shadow-sm",
                    status === 'over-budget' ? "bg-error" : status === 'warning' ? "bg-tertiary" : "bg-primary"
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center mt-8 pt-4 border-t border-outline-variant/5 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black border border-primary/20 text-primary">
              {manager?.split(' ').map(n => n[0]).join('') || '??'}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-outline uppercase tracking-tighter">Gerente</span>
              <span className="text-xs font-bold text-on-surface-variant leading-none">{manager}</span>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <button 
              onClick={() => setIsDetailsOpen(true)}
              className="text-[10px] font-black text-primary uppercase tracking-widest hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors border border-primary/20"
            >
              Detalhes
            </button>
          </div>
        </div>
      </motion.div>

      <Modal 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
        title={`Detalhes do Projeto: ${title}`}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-surface-container-highest rounded-2xl border border-outline-variant/10">
            <div className={cn("p-3 rounded-xl", config.bg)}>
              <StatusIcon className={cn("w-6 h-6", config.color)} />
            </div>
            <div>
              <p className="text-[10px] font-black text-outline uppercase tracking-widest">Status Atual</p>
              <p className={cn("text-lg font-bold", config.color)}>{config.label}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-outline uppercase tracking-widest">Descrição Estratégica</p>
            <p className="text-sm text-on-surface-variant leading-relaxed bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/5 italic">
              &quot;{description || 'Nenhuma descrição detalhada fornecida para este projeto estratégico.'}&quot;
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/5">
              <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">Restante</p>
              <p className="text-xl font-black text-primary">{formatCurrency(remaining)}</p>
            </div>
            <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/5">
              <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">Responsável</p>
              <p className="text-xl font-black text-on-surface">{manager}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-outline uppercase tracking-widest">Atingimento de Metas</span>
              <span className="text-2xl font-black text-primary">{progress}%</span>
            </div>
            <div className="h-4 w-full bg-surface-container-highest rounded-full overflow-hidden p-1 border border-outline-variant/10">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className={cn("h-full rounded-full shadow-lg", 
                  status === 'over-budget' ? "bg-error" : "bg-gradient-to-r from-primary to-on-primary-container"
                )}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              onClick={() => {
                setIsDetailsOpen(false);
                onEdit?.();
              }}
              className="flex-1 py-3 bg-surface-container-highest text-on-surface font-bold rounded-xl hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2"
            >
              <Edit2 className="w-4 h-4" /> Editar
            </button>
          </div>
          <button 
            onClick={() => setIsDetailsOpen(false)}
            className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
          >
            Fechar
          </button>
        </div>
      </Modal>
    </>
  );
}
