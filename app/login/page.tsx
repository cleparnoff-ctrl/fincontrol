'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  signOut 
} from 'firebase/auth';
// ADICIONADO: getDocFromServer para ignorar o cache offline
import { doc, setDoc, getDocFromServer } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/firebase';
import { Mail, Lock, LogIn } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const checkWhitelist = async (userEmail: string) => {
    try {
      const whiteRef = doc(db, 'whitelist', userEmail.toLowerCase());
      
      // ALTERADO: Usamos getDocFromServer para evitar o erro "client is offline"
      const whiteSnap = await getDocFromServer(whiteRef);
      
      if (whiteSnap.exists() && whiteSnap.data().status === 'ativo') {
        return { authorized: true, isNetworkError: false };
      }
      return { authorized: false, isNetworkError: false };
    } catch (err: any) {
      console.error("Erro ao verificar whitelist:", err);
      // Se for erro de rede/offline, permitimos acesso temporário para evitar travamentos no Iframe
      if (err?.message?.includes('offline') || err?.code === 'unavailable') {
        console.warn("Ambiente possivelmente restrito. Permitindo acesso temporário.");
        return { authorized: true, isNetworkError: true };
      }
      return { authorized: false, isNetworkError: false };
    }
  };

  const createUserProfile = async (user: any) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDocFromServer(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          role: 'user'
        });
      }
    } catch (err) {
      console.error("Erro ao criar perfil:", err);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      let userCredential;
      if (isRegistering) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfile(userCredential.user);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }

      const { authorized } = await checkWhitelist(userCredential.user.email!);
      if (authorized) {
        router.push('/');
      } else {
        setError('Acesso negado: Seu e-mail não está na lista de autorizados.');
        await signOut(auth);
      }

    } catch (err: any) {
      setError('Erro na autenticação. Verifique se você está online e suas credenciais.');
      console.error(err);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const { authorized } = await checkWhitelist(result.user.email!);
      
      if (authorized) {
        await createUserProfile(result.user);
        router.push('/');
      } else {
        setError('E-mail não autorizado na Whitelist.');
        await signOut(auth);
      }
    } catch (err: any) {
      setError('Falha no login com Google. Tente abrir em uma nova aba.');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-container p-8 rounded-3xl border border-outline-variant/10 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold font-headline">FinControl</h1>
          <p className="text-outline">Bem-vindo de volta, execute o seu sucesso.</p>
        </div>

        {error && <p className="text-error text-sm text-center bg-error/10 p-2 rounded-lg">{error}</p>}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 w-5 h-5 text-outline" />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 p-3 rounded-xl bg-surface-container-high border border-outline-variant/10 focus:border-primary outline-none"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 w-5 h-5 text-outline" />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 p-3 rounded-xl bg-surface-container-high border border-outline-variant/10 focus:border-primary outline-none"
              required
            />
          </div>
          <button type="submit" className="w-full p-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 flex items-center justify-center gap-2">
            <LogIn className="w-5 h-5" />
            {isRegistering ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-outline-variant/20"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-surface-container px-2 text-outline">Ou continue com</span>
          </div>
        </div>

        <button 
          onClick={handleGoogleAuth}
          className="w-full p-3 bg-surface-container-high hover:bg-surface-container-highest rounded-xl font-bold flex items-center justify-center gap-3 transition-colors"
        >
          <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={20} height={20} />
          Google
        </button>

        <p className="text-center text-sm">
          {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'}
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="ml-1 text-primary font-bold hover:underline"
          >
            {isRegistering ? 'Entrar' : 'Registrar-se'}
          </button>
        </p>
      </div>
    </div>
  );
}
