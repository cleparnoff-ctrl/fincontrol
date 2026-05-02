'use client';

import React, { useEffect, useState } from 'react';
import { auth, db } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { ShieldAlert } from 'lucide-react';

export default function AccessControl() {
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        // Escuta o banco de dados EM TEMPO REAL
        const q = query(collection(db, 'companies'), where('userId', '==', user.uid));
        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const companyData = snapshot.docs[0].data();
            // Se o status for "suspended", ativa o cadeado
            if (companyData.status === 'suspended') {
              setIsSuspended(true);
            } else {
              setIsSuspended(false);
            }
          }
        });
        return () => unsubscribeSnapshot();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Se não estiver suspenso, o componente fica invisível e não faz nada
  if (!isSuspended) return null;

  // Se estiver suspenso, cobre a tela inteira com o bloqueio
  return (
    <div className="fixed inset-0 z-[9999] bg-surface-container-lowest/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="max-w-md w-full bg-surface-container-low p-8 rounded-3xl border border-error/30 text-center shadow-2xl">
        <div className="w-20 h-20 bg-error-container text-error rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface mb-3 tracking-tight">Acesso Suspenso</h1>
        <p className="text-outline mb-8 text-sm md:text-base leading-relaxed">
          Sua conta encontra-se temporariamente bloqueada por pendências administrativas. Por favor, entre em contato com a sua contabilidade para regularizar o acesso ao sistema.
        </p>
        <button 
          onClick={() => auth.signOut()}
          className="w-full py-4 bg-error text-on-error font-bold rounded-2xl shadow-lg shadow-error/20 hover:brightness-110 active:scale-95 transition-all"
        >
          Sair da Conta
        </button>
      </div>
    </div>
  );
}