'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: '',
        role: 'user'
      });

      router.push('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4 p-6 bg-surface-container rounded-3xl border border-outline-variant/10">
      <h2 className="text-xl font-bold">Criar Conta</h2>
      {error && <p className="text-error text-sm">{error}</p>}
      <input
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-3 rounded-xl bg-surface-container-high border border-outline-variant/10"
        required
      />
      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-3 rounded-xl bg-surface-container-high border border-outline-variant/10"
        required
      />
      <button type="submit" className="w-full p-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90">
        Registrar
      </button>
    </form>
  );
}
