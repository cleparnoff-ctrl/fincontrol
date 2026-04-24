'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, getDocsFromServer, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase';

export interface Category {
  id: string;
  name: string;
  userId?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  manager: string;
  budgeted: number;
  spent: number;
  remaining: number;
  progress: number;
  status: 'on-track' | 'warning' | 'over-budget';
  size?: 'large';
  userId?: string;
}

export interface Expense {
  id: string;
  date: string;
  dueDate: string;
  supplier: string;
  description: string;
  project: string;
  category: string;
  amount: string;
  status: string;
  userId?: string;
}

interface DataContextType {
  projects: Project[];
  expenses: Expense[];
  categories: Category[];
  addProject: (project: Omit<Project, 'id'>) => Promise<void>;
  updateProject: (id: string, project: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const DEFAULT_CATEGORIES = [
  'Operacional',
  'Marketing',
  'Folha de Pagamento',
  'Impostos',
  'Tecnologia'
];

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setProjects([]);
        setExpenses([]);
        setCategories([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen to Projects
    const qProjects = query(collection(db, 'projects'), where('userId', '==', user.uid));
    const unsubscribeProjects = onSnapshot(qProjects, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Project[];
      setProjects(projectsData);
    }, (error) => {
      console.error("Erro no stream de projetos (projects):", error);
    });

    // Listen to Expenses
    const qExpenses = query(collection(db, 'lancamentos'), where('userId', '==', user.uid));
    const unsubscribeExpenses = onSnapshot(qExpenses, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Expense[];
      setExpenses(expensesData);
    }, (error) => {
      console.error("Erro no stream de lançamentos:", error);
    });

    // Listen to Categories
    const qCategories = query(collection(db, 'categories'), where('userId', '==', user.uid));
    const unsubscribeCategories = onSnapshot(qCategories, (snapshot) => {
      if (snapshot.empty) {
        // If empty, use default categories mapped to Category interface shape temporarily in state
        setCategories(DEFAULT_CATEGORIES.map(name => ({ id: `default-${name}`, name, userId: user.uid })));
      } else {
        const categoriesData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as Category[];
        setCategories(categoriesData);
      }
    }, (error) => {
      console.error("Erro no stream de categorias:", error);
    });

    return () => {
      unsubscribeProjects();
      unsubscribeExpenses();
      unsubscribeCategories();
    };
  }, [user]);

  const addProject = React.useCallback(async (project: Omit<Project, 'id'>) => {
    if (!user) return;
    
    // Slugify title for ID
    const slug = project.title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const projectRef = doc(db, 'projects', `${user.uid}_${slug}`);
    
    // Check if project already exists
    const docSnap = await getDoc(projectRef);
    if (docSnap.exists()) {
      throw new Error('DUPLICATE_NAME');
    }

    console.log('Criando projeto:', {
      ...project,
      userId: user.uid
    });
    await setDoc(projectRef, {
      ...project,
      userId: user.uid
    });
    console.log('Projeto criado com sucesso.');
  }, [user]);

  const updateProject = React.useCallback(async (id: string, updatedFields: Partial<Project>) => {
    if (!user) return;
    
    // Create a copy and remove the 'id' field to avoid writing it into the document data
    const { id: _, ...dataToUpdate } = updatedFields as any;

    // If title is being updated, check for duplicates (excluding the current project)
    if (dataToUpdate.title) {
      const slug = dataToUpdate.title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      const newId = `${user.uid}_${slug}`;
      
      if (newId !== id) {
        const projectRef = doc(db, 'projects', newId);
        const docSnap = await getDoc(projectRef);
        if (docSnap.exists()) {
          throw new Error('DUPLICATE_NAME');
        }
        // If we want to keep ID in sync with title, we would migrate here.
        // For now, we just update the title field in the existing document.
      }
    }

    const projectRef = doc(db, 'projects', id);
    console.log('Document reference for update:', projectRef.path);
    await updateDoc(projectRef, dataToUpdate);
    console.log('Project updated successfully in Firestore.');
  }, [user]);

  const deleteProject = React.useCallback(async (id: string) => {
    if (!user) return;
    const projectRef = doc(db, 'projects', id);
    await deleteDoc(projectRef);
  }, [user]);

  const addExpense = React.useCallback(async (expense: Omit<Expense, 'id'>) => {
    if (!user) return;
    await addDoc(collection(db, 'lancamentos'), {
      ...expense,
      userId: user.uid
    });
  }, [user]);

  const updateExpense = async (id: string, updatedFields: Partial<Expense>) => {
    if (!user) return;
    const expenseRef = doc(db, 'lancamentos', id);
    await updateDoc(expenseRef, updatedFields);
  };

  const deleteExpense = React.useCallback(async (id: string) => {
    if (!user) return;
    const expenseRef = doc(db, 'lancamentos', id);
    await deleteDoc(expenseRef);
  }, [user]);

  const addCategory = React.useCallback(async (name: string) => {
    if (!user) return;
    return new Promise<void>(async (resolve, reject) => {
      try {
        const q = query(collection(db, 'categories'), where('userId', '==', user.uid), where('name', '==', name));
        const limitRes = await getDocsFromServer(q);
        if(!limitRes.empty) {
          reject(new Error('DUPLICATE_CATEGORY'));
          return;
        }

        // Check if no categories exist yet, we might want to bootstrap them? No, let's just add one.
        // Actually, if we are saving the first custom category, maybe we should also save the default ones so they don't disappear?
        // To be safe, if we have 0 categories mapped in firestore, we bulk add the defaults plus the new one.
        const allCategoriesCheck = await getDocsFromServer(query(collection(db, 'categories'), where('userId', '==', user.uid)));
        if (allCategoriesCheck.empty) {
          await Promise.all(DEFAULT_CATEGORIES.map(cat => 
            addDoc(collection(db, 'categories'), { name: cat, userId: user.uid })
          ));
        }

        await addDoc(collection(db, 'categories'), {
          name,
          userId: user.uid
        });
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }, [user]);

  const deleteCategory = React.useCallback(async (id: string) => {
    if (!user) return;
    if (id.startsWith('default-')) return; // Cannot delete unsaved defaults via standard delete, though they shouldn't show a delete button anyway ideally.
    const ref = doc(db, 'categories', id);
    await deleteDoc(ref);
  }, [user]);

  return (
    <DataContext.Provider value={{ projects, expenses, categories, addProject, updateProject, deleteProject, addExpense, updateExpense, deleteExpense, addCategory, deleteCategory }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
