'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { UserCircle, Settings, LogOut, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Modal from './Modal';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';

const navLinks = [
  { name: 'Dashboard', href: '/' },
  { name: 'Projetos', href: '/projects' },
  { name: 'Despesas', href: '/expenses' },
  { name: 'Configurações', href: '/settings' },
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeModal, setActiveModal] = useState<'add' | 'profile' | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (pathname === '/login') return null;

  return (
    <header className="bg-background/80 backdrop-blur-md flex justify-between items-center px-3 md:px-8 h-16 w-full top-0 z-50 fixed border-b border-outline-variant/5">
      <div className="flex items-center gap-2 sm:gap-4 md:gap-8">
        <button 
          className="lg:hidden text-outline hover:text-primary transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <Link href="/" className="text-base sm:text-lg md:text-xl font-bold text-primary tracking-tighter font-headline">
          FinControl
        </Link>
        <nav className="hidden lg:flex gap-6 items-center">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "text-sm font-medium font-headline tracking-tight transition-colors duration-200 relative pb-1",
                  isActive 
                    ? "text-primary font-bold border-b-2 border-primary" 
                    : "text-outline hover:text-primary"
                )}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="flex items-center gap-0.5 sm:gap-1">
          <button 
            className="w-10 h-10 flex items-center justify-center text-outline hover:text-primary hover:bg-primary/10 rounded-full transition-all active:scale-95" 
            title="Perfil"
            onClick={() => setActiveModal('profile')}
          >
            <UserCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-16 bg-[#0b1326] z-[9999] lg:hidden animate-in slide-in-from-left duration-300">
          <nav className="p-6 space-y-4 h-[calc(100vh-64px)] overflow-y-auto bg-[#0b1326]">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl text-lg font-bold transition-all",
                    isActive 
                      ? "bg-primary/20 text-primary border border-primary/30" 
                      : "text-outline hover:bg-surface-container-high"
                  )}
                >
                  {link.name}
                </Link>
              );
            })}
            <div className="pt-8 border-t border-outline-variant/20 space-y-4">
              <button 
                onClick={() => {
                  setActiveModal('profile');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-4 p-4 text-outline hover:bg-surface-container-high rounded-2xl transition-all"
              >
                <UserCircle className="w-5 h-5" />
                <span className="font-bold">Perfil</span>
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Modals */}
      <Modal 
        isOpen={activeModal === 'profile'} 
        onClose={() => setActiveModal(null)} 
        title="Perfil do Executivo"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <button 
              className="w-full flex items-center gap-3 p-3 hover:bg-error/10 text-error rounded-xl transition-colors"
              onClick={() => signOut(auth)}
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Sair do Sistema</span>
            </button>
          </div>
          
          <div className="pt-4 border-t border-outline-variant/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
                <UserCircle className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h4 className="text-base font-bold">{auth.currentUser?.displayName || auth.currentUser?.email || 'Usuário'}</h4>
                <p className="text-[10px] text-primary mt-1 font-mono bg-primary/5 p-1 rounded border border-primary/10">
                  UID: {auth.currentUser?.uid || 'Não identificado'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </header>
  );
}
