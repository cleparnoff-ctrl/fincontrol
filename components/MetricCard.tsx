'use client';

import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  trend?: {
    value: string;
    isUp: boolean;
  };
  progress?: number;
  progressLabel?: string;
  efficiency?: number;
}

export default function MetricCard({ title, value, trend, progress, progressLabel, efficiency }: MetricCardProps) {
  const isNegative = value.includes('-') || (trend && !trend.isUp && title === 'Variância');
  const isOverBudget = title === 'Total Gasto' && progress !== undefined && progress > 100;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-surface-container-low p-4 rounded-2xl relative overflow-hidden group border transition-all duration-300",
        isNegative || isOverBudget ? "border-error/30 bg-error/5" : "border-outline-variant/5 hover:border-primary/20"
      )}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-all duration-500"></div>
      
      <p className="text-outline text-[10px] font-medium uppercase tracking-wider mb-1">{title}</p>
      <h2 className={cn(
        "text-2xl font-headline font-extrabold mb-3",
        isNegative || isOverBudget ? "text-error" : "text-on-surface"
      )}>{value}</h2>
      
      {(isNegative || isOverBudget) && title === 'Variância' && (
        <div className="mb-4 px-3 py-1.5 bg-error text-on-error text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 animate-pulse">
          <AlertTriangle className="w-3 h-3" />
          Acima do Orçamento
        </div>
      )}

      {trend && (
        <div className={cn(
          "flex items-center gap-1.5 w-fit px-2 py-0.5 rounded text-[10px] font-bold",
          trend.isUp ? "text-on-primary-container bg-primary/10" : "text-error bg-error/10"
        )}>
          {trend.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {(trend.value || '').replace('vs LY', 'vs ano ant.').replace('Under Budget', 'Abaixo do Orçamento')}
        </div>
      )}

      {progress !== undefined && (
        <>
          <div className="w-full bg-surface-container-highest h-1.5 rounded-full mb-2">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, progress)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn(
                "h-1.5 rounded-full",
                progress > 100 ? "bg-error" : "bg-gradient-to-r from-primary to-on-primary-container"
              )}
            />
          </div>
          <p className={cn(
            "text-[10px]",
            progress > 100 ? "text-error font-bold" : "text-outline"
          )}>{progressLabel}</p>
        </>
      )}

      {efficiency !== undefined && (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div 
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-500",
                i <= Math.round(efficiency / 20) ? "bg-primary" : "bg-surface-container-highest"
              )}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
