
import { Transaction, Goal, Bill, Budget, SavedFilter, AppNotification } from '../types';
import { supabase } from './supabaseClient';

// ==========================================
// CONFIGURATION & HELPERS
// ==========================================

const getLocal = (key: string) => {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : [];
};

const saveLocal = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Generic handler: Tries Supabase, falls back to Local handler on error
const handleRequest = async <T>(
    apiCall: () => Promise<T>, 
    localFallback: () => T | Promise<T>
): Promise<T> => {
    try {
        return await apiCall();
    } catch (e) {
        console.warn("Supabase unavailable or error, using local data fallback.", e);
        return localFallback();
    }
};

// ==========================================
// API INTERFACE (SUPABASE IMPL)
// ==========================================

export const api = {
  // --- Transactions ---
  getTransactions: async (): Promise<Transaction[]> => {
    return handleRequest(
        async () => {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('date', { ascending: false });
            
            if (error) throw error;
            return data as Transaction[];
        },
        () => getLocal('spendwise_expenses')
    );
  },

  createTransaction: async (t: Transaction): Promise<Transaction> => {
    return handleRequest(
        async () => {
            const { data, error } = await supabase
                .from('transactions')
                .insert([t])
                .select();

            if (error) throw error;
            return data[0] as Transaction;
        },
        () => {
            const data = getLocal('spendwise_expenses');
            saveLocal('spendwise_expenses', [t, ...data]);
            return t;
        }
    );
  },

  updateTransaction: async (t: Transaction): Promise<Transaction> => {
    return handleRequest(
        async () => {
            const { data, error } = await supabase
                .from('transactions')
                .update(t)
                .eq('id', t.id)
                .select();

            if (error) throw error;
            return data[0] as Transaction;
        },
        () => {
            const data = getLocal('spendwise_expenses');
            const updated = data.map((item: Transaction) => item.id === t.id ? t : item);
            saveLocal('spendwise_expenses', updated);
            return t;
        }
    );
  },

  deleteTransaction: async (id: string): Promise<void> => {
    return handleRequest(
        async () => {
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        () => {
            const data = getLocal('spendwise_expenses');
            saveLocal('spendwise_expenses', data.filter((t: Transaction) => t.id !== id));
        }
    );
  },

  // --- Goals ---
  getGoals: async (): Promise<Goal[]> => {
    return handleRequest(
        async () => {
            const { data, error } = await supabase.from('goals').select('*');
            if (error) throw error;
            return data as Goal[];
        },
        () => getLocal('spendwise_goals')
    );
  },

  saveGoals: async (goals: Goal[]): Promise<void> => {
    // For lists like goals, we usually just upsert all to sync state
    return handleRequest(
        async () => {
            // Upsert allows inserting new ones and updating existing ones
            const { error } = await supabase
                .from('goals')
                .upsert(goals, { onConflict: 'id' });
            
            if (error) throw error;
            
            // Note: This simple sync doesn't handle deletions efficiently without more logic,
            // but fits the current app architecture.
        },
        () => saveLocal('spendwise_goals', goals)
    );
  },

  // --- Bills ---
  getBills: async (): Promise<Bill[]> => {
    return handleRequest(
        async () => {
            const { data, error } = await supabase.from('bills').select('*');
            if (error) throw error;
            return data as Bill[];
        },
        () => getLocal('spendwise_bills')
    );
  },

  saveBills: async (bills: Bill[]): Promise<void> => {
    return handleRequest(
        async () => {
            const { error } = await supabase
                .from('bills')
                .upsert(bills, { onConflict: 'id' });
            if (error) throw error;
        },
        () => saveLocal('spendwise_bills', bills)
    );
  },

  // --- Budgets ---
  getBudgets: async (): Promise<Budget[]> => {
    return handleRequest(
        async () => {
            const { data, error } = await supabase.from('budgets').select('*');
            if (error) throw error;
            return data as Budget[];
        },
        () => getLocal('spendwise_budgets')
    );
  },

  saveBudgets: async (budgets: Budget[]): Promise<void> => {
    return handleRequest(
        async () => {
             // First delete all (simplest way to sync budgets array) or upsert
             // Since budgets key is 'category', upsert works well
             if (budgets.length > 0) {
                 const { error } = await supabase
                    .from('budgets')
                    .upsert(budgets, { onConflict: 'category' });
                 if (error) throw error;
             }
        },
        () => saveLocal('spendwise_budgets', budgets)
    );
  },

  // --- Misc (Income, Filters, Notifications) ---
  
  // Stored locally for now as these are user-preference/session specific in this architecture
  getExpectedIncome: (): number => {
    const saved = localStorage.getItem('spendwise_budget');
    return saved ? parseFloat(saved) : 0;
  },
  
  saveExpectedIncome: (amount: number) => {
    localStorage.setItem('spendwise_budget', amount.toString());
  },

  getFilters: (): SavedFilter[] => getLocal('spendwise_filters'),
  saveFilters: (filters: SavedFilter[]) => saveLocal('spendwise_filters', filters),

  getNotifications: (): AppNotification[] => getLocal('spendwise_notifications'),
  saveNotifications: (n: AppNotification[]) => saveLocal('spendwise_notifications', n),
};
