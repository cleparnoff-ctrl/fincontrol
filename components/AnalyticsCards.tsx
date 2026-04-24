'use client';

import React from 'react';
import { Clock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { useData } from '@/lib/store';
import { useRouter } from 'next/navigation';

export default function AnalyticsCards() {
  const { expenses } = useData();
  const router = useRouter();

  const analysis = React.useMemo(() => {
    const total = expenses.length;
    if (total === 0) return { onTime: 0, late: 0, early: 0, avgDelay: 0 };

    let onTime = 0;
    let late = 0;
    let early = 0;
    let totalDiff = 0;

    expenses.forEach(exp => {
      const payDate = new Date(exp.date);
      const dueDate = new Date(exp.dueDate);
      const diffTime = payDate.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        late++;
        totalDiff += diffDays;
      } else if (diffDays < 0) {
        early++;
      } else {
        onTime++;
      }
    });

    return {
      onTime: Math.round((onTime / total) * 100),
      late: Math.round((late / total) * 100),
      early: Math.round((early / total) * 100),
      avgDelay: late > 0 ? Math.round(totalDiff / late) : 0
    };
  }, [expenses]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-4 h-full">
      <div className="bg-gradient-to-br from-surface-container-low to-surface-container p-5 rounded-3xl border border-outline-variant/10 flex flex-col justify-between">
        <div className="flex justify-between items-start mb-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </div>
          <span className="text-[8px] font-bold text-primary bg-primary-container px-2 py-0.5 rounded">PAGAMENTOS EM DIA</span>
        </div>
        <div>
          <h3 className="text-on-surface-variant text-[10px] font-medium mb-0.5 uppercase tracking-wider">Taxa de Pontualidade</h3>
          <div className="text-xl font-bold font-headline">{analysis.onTime + analysis.early}%</div>
          <div className="mt-3 h-1 w-full bg-surface-container-lowest rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${analysis.onTime + analysis.early}%` }}></div>
          </div>
          <p className="text-[9px] text-outline mt-1.5 italic">{analysis.early}% pagos antecipadamente</p>
        </div>
      </div>

      <div className="bg-surface-container-low p-5 rounded-3xl border border-outline-variant/10 relative overflow-hidden group flex flex-col justify-between">
        <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:scale-110 transition-transform duration-500">
          <Clock className="w-[80px] h-[80px]" />
        </div>
        <div>
          <h3 className="text-on-surface-variant text-[10px] font-medium mb-0.5 uppercase tracking-wider">Atrasos Médios</h3>
          <div className="text-xl font-bold font-headline">{analysis.avgDelay} Dias</div>
          <p className="text-[10px] text-error mt-3 flex items-center font-medium">
            <AlertCircle className="w-3 h-3 mr-1" />
            {analysis.late}% das contas pagas após o vencimento
          </p>
        </div>
      </div>

      <div className="bg-surface-container-low p-5 rounded-3xl border border-outline-variant/10 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-on-surface-variant text-[10px] font-medium uppercase tracking-wider">Próximos Vencimentos</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-lg font-bold font-headline leading-tight">Fluxo de Caixa</div>
            <div className="text-[9px] text-outline">Análise de Vencimento vs Pagamento</div>
          </div>
          <button 
            onClick={() => router.push('/expenses')}
            className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant/10 hover:bg-primary/10 hover:border-primary/30 transition-all active:scale-95"
          >
            <Calendar className="w-5 h-5 text-primary" />
          </button>
        </div>
      </div>
    </div>
  );
}
