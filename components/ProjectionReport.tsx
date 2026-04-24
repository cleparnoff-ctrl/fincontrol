'use client';

import React from 'react';
import { Download, CalendarCheck } from 'lucide-react';
import { collection, query, where, getDocsFromServer } from 'firebase/firestore';
import { auth, db } from '@/firebase';

export default function ProjectionReport() {
  const handleDownload = async () => {
    if (!auth.currentUser?.uid) {
      alert('Você precisa estar logado para exportar dados.');
      return;
    }

    try {
      // Relatório CSV: Deve exportar os dados de 'lancamentos'
      const q = query(collection(db, 'lancamentos'), where('userId', '==', auth.currentUser.uid));
      const snapshot = await getDocsFromServer(q);
      const expensesToExport = snapshot.docs.map(doc => doc.data());

      if (expensesToExport.length === 0) {
        alert('Nenhum lançamento encontrado para exportar.');
        return;
      }

      const content = "Data,Fornecedor,Descrição,Projeto,Categoria,Valor\n" + 
        expensesToExport.map(e => `${e.date},${e.supplier},${e.description},${e.project},${e.category},${e.amount}`).join("\n");
      
      const blob = new Blob([content], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Relatorio_Lancamentos_FinControl.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar CSV:', err);
      alert('Erro ao gerar relatório CSV. Tente novamente.');
    }
  };

  const handleSchedule = () => {
    alert('Abrindo calendário para agendamento de revisão fiscal...');
  };

  return (
    <div className="mt-10 bg-gradient-to-r from-surface-container-high to-surface-container p-1 rounded-3xl overflow-hidden border border-outline-variant/10">
      <div className="bg-background rounded-[1.4rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>
        <div className="flex-1">
          <h3 className="text-2xl font-extrabold font-headline mb-2">Relatório de Projeção Trimestral</h3>
          <p className="text-outline text-sm max-w-md">
            Nosso motor de inteligência prevê um <span className="text-primary font-bold">superávit de 5,4%</span> até o final do ano fiscal com base nas tendências atuais de otimização e dados de negociação com fornecedores.
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-3 bg-surface-container-highest border border-primary/20 rounded-xl font-bold text-sm hover:bg-surface-bright transition-all"
          >
            <Download className="w-4 h-4" />
            Baixar CSV
          </button>
          <button 
            onClick={handleSchedule}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-primary to-on-primary-container text-on-primary font-bold rounded-xl shadow-[0_10px_20px_-5px_rgba(0,147,101,0.4)] active:scale-95 duration-100 text-sm"
          >
            <CalendarCheck className="w-4 h-4" />
            Agendar Revisão
          </button>
        </div>
      </div>
    </div>
  );
}
