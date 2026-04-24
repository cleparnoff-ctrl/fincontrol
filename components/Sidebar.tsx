'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Network, 
  ReceiptText, 
  Settings, 
  HelpCircle, 
  ShieldCheck,
  BarChart3
} from 'lucide-react';
import { motion } from 'motion/react';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { name: 'Projects', icon: Network, href: '/projects' },
  { name: 'Expenses', icon: ReceiptText, href: '/expenses' },
];

export default function Sidebar() {
  const pathname = usePathname();
  if (pathname === '/login') return null;

  const handleNewAnalysis = () => {
    alert('Iniciando nova análise de inteligência...');
  };

  return (
    <aside className="hidden lg:flex flex-col h-screen w-64 fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant/10 p-6 z-40 pt-24">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center border border-primary/20">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-on-surface">Inteligência de Portfólio</h3>
            <p className="text-[10px] text-primary uppercase tracking-widest font-semibold">Nível de Riqueza: Platinum</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const href = typeof item.href === 'string' ? item.href : (item as any).href || '/';
          const isActive = pathname === href;
          const name = item.name === 'Dashboard' ? 'Dashboard' : item.name === 'Projects' ? 'Projetos' : 'Despesas';
          
          // Fix for the previous mapping error in my thought process
          const realHref = item.name === 'Dashboard' ? '/' : item.name === 'Projects' ? '/projects' : '/expenses';
          const realIsActive = pathname === realHref;
          const realName = item.name === 'Dashboard' ? 'Dashboard' : item.name === 'Projects' ? 'Projetos' : 'Despesas';

          return (
            <Link
              key={item.name}
              href={realHref}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-all duration-300 hover:translate-x-1",
                realIsActive 
                  ? "bg-surface-bright text-primary font-semibold" 
                  : "text-outline hover:text-on-surface hover:bg-surface-container"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-sans text-sm">{realName}</span>
              {realIsActive && (
                <motion.div
                  layoutId="active-pill"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(78,222,163,0.6)]"
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-outline-variant/10">
      </div>
    </aside>
  );
}
