'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from '@/firebase';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          if (user.email) {
            const docRef = doc(db, "whitelist", user.email.toLowerCase());
            // Tentamos buscar do servidor
            try {
              const docSnap = await getDocFromServer(docRef);

              if (docSnap.exists() && docSnap.data().status === "ativo") {
                setAuthorized(true);
                if (pathname === '/login') {
                  router.push('/');
                }
              } else {
                console.warn("Usuário não autorizado na whitelist:", user.email);
                await signOut(auth);
                setAuthorized(false);
                if (pathname !== '/login') {
                  window.location.href = '/login';
                }
              }
            } catch (serverError: any) {
              // Se o erro for de rede/offline, permitimos acesso temporário para evitar travamentos no Iframe
              console.error("Erro de conexão com o servidor de whitelist:", serverError);
              
              if (serverError?.message?.includes('offline') || 
                  serverError?.code === 'unavailable' || 
                  serverError?.code === 'deadline-exceeded' || 
                  serverError?.message?.toLowerCase().includes('timeout')) {
                console.warn("Ambiente possivelmente restrito ou timeout. Permitindo acesso temporário.");
                setAuthorized(true);
                if (pathname === '/login') {
                  router.push('/');
                }
              } else {
                // Outros erros ainda deslogam por segurança
                await signOut(auth);
                setAuthorized(false);
                if (pathname !== '/login') {
                  window.location.href = '/login';
                }
              }
            }
          }
        } catch (error) {
          console.error("Erro crítico na verificação de auth:", error);
          setAuthorized(false);
        }
      } else {
        setAuthorized(false);
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-on-background p-4 text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="font-headline font-bold text-xl">Verificando Credenciais...</h2>
        <p className="text-outline text-sm mt-2">Conectando ao servidor de segurança.</p>
      </div>
    );
  }

  // If we are on login page, we can show it even if not authorized
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // If authorized, show the app
  if (authorized) {
    return <>{children}</>;
  }

  // Fallback while redirecting
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-on-background p-4 text-center">
      <h2 className="font-headline font-bold text-xl mb-4">Redirecionando...</h2>
      <p className="text-outline text-sm mb-6">Sua sessão está sendo validada ou você não tem acesso.</p>
      <a 
        href="/login" 
        className="px-6 py-2 bg-primary text-on-primary rounded-xl font-bold text-sm hover:brightness-110 transition-all"
      >
        Ir para Login
      </a>
      <p className="mt-8 text-xs text-outline max-w-xs">
        Se o problema persistir, tente abrir o aplicativo em uma <strong>nova aba</strong> usando o ícone no topo do preview.
      </p>
    </div>
  );
}
