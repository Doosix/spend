import React, { useState, useEffect, useMemo } from 'react';
import { Tab, Transaction, Budget, Goal, Bill, SavedFilter, AppNotification } from './types';
import Dashboard from './components/Dashboard';
import AddTransaction from './components/AddExpense';
import TransactionList from './components/ExpenseList';
import Insights from './components/Insights';
import Reports from './components/Reports';
import Goals from './components/Goals';
import Bills from './components/Bills';
import { api } from './services/api'; 
import { LayoutDashboard, Plus, Calendar, PieChart, Loader2, History } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  
  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expectedIncome, setExpectedIncome] = useState<number>(0);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // --- Initial Data Loading ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const [txs, inc, bgs, gls, bls, flts, notifs] = await Promise.all([
          api.getTransactions(),
          Promise.resolve(api.getExpectedIncome()), 
          api.getBudgets(),
          api.getGoals(),
          api.getBills(),
          Promise.resolve(api.getFilters()),
          Promise.resolve(api.getNotifications())
        ]);

        const validTxs = txs.map((t: any) => ({ ...t, type: t.type || 'expense' }));

        setTransactions(validTxs);
        setExpectedIncome(inc);
        setBudgets(bgs);
        setGoals(gls);
        setBills(bls);
        setSavedFilters(flts);
        setNotifications(notifs);
        
        runBillLogic(bls, validTxs, notifs);

      } catch (error) {
        console.error("Failed to load data from API/DB", error);
        pushNotification('Connection Error', 'Failed to connect to the database. Using offline mode if available.', 'alert');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSetExpectedIncome = (val: number) => {
    setExpectedIncome(val);
    api.saveExpectedIncome(val);
  };

  const handleSetBudgets = (newBudgets: Budget[]) => {
    setBudgets(newBudgets);
    api.saveBudgets(newBudgets);
  };

  const handleSetGoals = (newGoals: Goal[]) => {
    setGoals(newGoals);
    api.saveGoals(newGoals);
  };

  const handleSetBills = (newBills: Bill[]) => {
    setBills(newBills);
    api.saveBills(newBills);
  };

  const handleSaveFilter = (filter: SavedFilter) => {
    const newFilters = [...savedFilters, filter];
    setSavedFilters(newFilters);
    api.saveFilters(newFilters);
  };

  const handleDeleteFilter = (id: string) => {
    const newFilters = savedFilters.filter(f => f.id !== id);
    setSavedFilters(newFilters);
    api.saveFilters(newFilters);
  };

  // --- Notifications ---
  const pushNotification = (title: string, message: string, type: AppNotification['type']) => {
      const newNotif: AppNotification = {
          id: uuidv4(),
          title,
          message,
          type,
          date: Date.now(),
          read: false
      };
      setNotifications(prev => {
        const updated = [newNotif, ...prev];
        api.saveNotifications(updated);
        return updated;
      });
  };

  const markNotificationsRead = () => {
      setNotifications(prev => {
        const updated = prev.map(n => ({ ...n, read: true }));
        api.saveNotifications(updated);
        return updated;
      });
  };

  const clearNotifications = () => {
      setNotifications([]);
      api.saveNotifications([]);
  };

  // --- Bill Logic (Run once on load) ---
  const runBillLogic = (currentBills: Bill[], _currentTxs: Transaction[], currentNotifs: AppNotification[]) => {
      const today = new Date();
      let updatedBills = [...currentBills];
      let newTransactions: Transaction[] = [];
      let billsChanged = false;
      let notifsToAdd: {title: string, msg: string, type: AppNotification['type']}[] = [];

      updatedBills = updatedBills.map(bill => {
          const lastPaid = bill.lastPaidDate ? new Date(bill.lastPaidDate) : null;
          const isPaidThisMonth = lastPaid && lastPaid.getMonth() === today.getMonth() && lastPaid.getFullYear() === today.getFullYear();
          
          // Bill Reminder
          if (!isPaidThisMonth && !bill.autoPay) {
               const daysUntilDue = bill.dueDateDay - today.getDate();
               if (daysUntilDue >= 0 && daysUntilDue <= 3) {
                   const alreadyAlerted = currentNotifs.some(n => n.message.includes(bill.name) && Date.now() - n.date < 24 * 60 * 60 * 1000);
                   if (!alreadyAlerted) {
                        notifsToAdd.push({
                            title: 'Bill Due Soon',
                            msg: `Your ${bill.name} bill (₹${bill.amount}) is due in ${daysUntilDue === 0 ? 'today' : daysUntilDue + ' days'}.`,
                            type: 'warning'
                        });
                   }
               }
          }

          // Auto Pay
          if (!bill.autoPay) return bill;
          
          if (!isPaidThisMonth && today.getDate() >= bill.dueDateDay) {
              const transaction: Transaction = {
                  id: uuidv4(),
                  type: 'expense',
                  amount: bill.amount,
                  description: `${bill.name} (Auto-Pay)`,
                  category: bill.category,
                  date: (today.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]) as string,
                  createdAt: Date.now(),
                  billId: bill.id,
                  isRecurring: true
              };
              newTransactions.push(transaction);
              billsChanged = true;
              
              notifsToAdd.push({
                  title: 'Bill Paid Automatically',
                  msg: `Paid ₹${bill.amount} for ${bill.name}.`,
                  type: 'info'
              });

              return { ...bill, lastPaidDate: transaction.date };
          }
          return bill;
      });

      if (billsChanged) {
          handleSetBills(updatedBills);
          newTransactions.forEach(t => api.createTransaction(t));
          setTransactions(prev => [...newTransactions, ...prev]);
      }

      if (notifsToAdd.length > 0) {
          notifsToAdd.forEach(n => pushNotification(n.title, n.msg, n.type));
      }
  };

  const checkAlerts = (newTx: Transaction, currentTransactions: Transaction[]) => {
      if (newTx.type === 'income') {
          pushNotification('Income Received', `You received ₹${newTx.amount.toFixed(2)} from ${newTx.description}.`, 'success');
      }

      if (newTx.goalId) {
          const goal = goals.find(g => g.id === newTx.goalId);
          if (goal) {
              const newAmount = goal.currentAmount + newTx.amount;
              const percent = (newAmount / goal.targetAmount) * 100;
              if (percent >= 100 && (goal.currentAmount / goal.targetAmount) * 100 < 100) {
                   pushNotification('Goal Completed! 🎉', `You've reached your goal: ${goal.name}!`, 'success');
              } else if (percent >= 50 && (goal.currentAmount / goal.targetAmount) * 100 < 50) {
                   pushNotification('Halfway There!', `You're 50% of the way to ${goal.name}. Keep it up!`, 'info');
              }
          }
      }

      const allTransactions = [newTx, ...currentTransactions];
      const income = allTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = allTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const balance = income - expense;

      const LOW_BALANCE_THRESHOLD = 2000;
      if (balance < LOW_BALANCE_THRESHOLD && (balance + (newTx.type === 'expense' ? newTx.amount : 0)) >= LOW_BALANCE_THRESHOLD) {
           pushNotification('Low Balance Warning', `Your balance has dropped below ₹${LOW_BALANCE_THRESHOLD}. Current: ₹${balance.toFixed(2)}`, 'alert');
      }

      if (newTx.type === 'expense') {
          const budget = budgets.find(b => b.category === newTx.category);
          if (budget) {
              const now = new Date(newTx.date);
              const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              const spentThisMonth = allTransactions
                .filter(t => t.type === 'expense' && t.category === newTx.category && new Date(t.date) >= startOfMonth)
                .reduce((sum, t) => sum + t.amount, 0);
              
              const prevSpent = spentThisMonth - newTx.amount;
              
              if (spentThisMonth > budget.limit && prevSpent <= budget.limit) {
                  pushNotification('Budget Exceeded', `You've exceeded your ${budget.period} limit for ${newTx.category}.`, 'alert');
              }
          }
      }
  };

  const addTransaction = async (t: Transaction) => {
    setTransactions(prev => [t, ...prev]);
    setActiveTab('list');
    
    try {
        await api.createTransaction(t);
        checkAlerts(t, transactions);
        
        if (t.goalId && t.type === 'expense') {
            const updatedGoals = goals.map(g => {
                if (g.id === t.goalId) {
                    return { ...g, currentAmount: g.currentAmount + t.amount };
                }
                return g;
            });
            handleSetGoals(updatedGoals);
        }

        if (t.billId) {
            const updatedBills = bills.map(b => {
                if (b.id === t.billId) {
                    return { ...b, lastPaidDate: t.date };
                }
                return b;
            });
            handleSetBills(updatedBills);
            pushNotification('Bill Paid', `Payment recorded for ${t.description}.`, 'success');
        }

    } catch (e) {
        console.error("Failed to save transaction", e);
        pushNotification('Error', 'Failed to save transaction to server.', 'alert');
    }
  };

  const handleUpdateTransaction = async (updatedT: Transaction) => {
      const original = transactions.find(t => t.id === updatedT.id);
      
      setTransactions(prev => prev.map(t => t.id === updatedT.id ? updatedT : t));
      setEditingTransaction(null);
      setActiveTab('list');

      try {
        await api.updateTransaction(updatedT);
        
        if (original) {
            const updatedGoals = goals.map(g => {
                let amount = g.currentAmount;
                if (original.goalId === g.id && original.type === 'expense') {
                    amount -= original.amount;
                }
                if (updatedT.goalId === g.id && updatedT.type === 'expense') {
                    amount += updatedT.amount;
                }
                return { ...g, currentAmount: Math.max(0, amount) };
            });
            handleSetGoals(updatedGoals);
        }
        pushNotification('Transaction Updated', 'Your transaction details have been updated.', 'info');
      } catch (e) {
          console.error("Failed to update", e);
          pushNotification('Error', 'Failed to update transaction on server.', 'alert');
      }
  };

  const deleteTransaction = async (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (window.confirm("Delete this transaction?")) {
        setTransactions(prev => prev.filter(e => e.id !== id));
        
        try {
            await api.deleteTransaction(id);
            if (transaction?.goalId && transaction.type === 'expense') {
                const updatedGoals = goals.map(g => {
                    if (g.id === transaction.goalId) {
                        return { ...g, currentAmount: Math.max(0, g.currentAmount - transaction.amount) };
                    }
                    return g;
                });
                handleSetGoals(updatedGoals);
            }
        } catch (e) {
            console.error("Failed to delete", e);
             pushNotification('Error', 'Failed to delete transaction on server.', 'alert');
        }
    }
  };

  const payBill = (bill: Bill) => {
      const transaction: Transaction = {
          id: uuidv4(),
          type: 'expense',
          amount: bill.amount,
          description: bill.name,
          category: bill.category,
          date: (new Date().toISOString().split('T')[0] || new Date().toISOString().split('T')[0]) as string,
          createdAt: Date.now(),
          billId: bill.id,
          isRecurring: true
      };
      addTransaction(transaction);
  };

  const recurringTemplates = useMemo(() => {
      const recurring = transactions.filter(t => t.isRecurring);
      const unique = new Map();
      recurring.forEach(t => {
          if (!unique.has(t.description)) {
              unique.set(t.description, t);
          }
      });
      return Array.from(unique.values());
  }, [transactions]);

  const renderContent = () => {
    if (isLoading) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-white">
                <Loader2 size={32} className="animate-spin mb-4 text-black" />
                <p className="text-gray-400 text-xs tracking-widest uppercase">Initializing</p>
            </div>
        )
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            transactions={transactions} 
            expectedIncome={expectedIncome} 
            setExpectedIncome={handleSetExpectedIncome}
            budgets={budgets}
            setBudgets={handleSetBudgets}
            bills={bills}
            goals={goals}
            notifications={notifications}
            markNotificationsRead={markNotificationsRead}
            clearNotifications={clearNotifications}
            onOpenAI={() => setActiveTab('insights')}
            onOpenBills={() => setActiveTab('bills')}
            onOpenGoals={() => setActiveTab('goals')}
            onOpenReports={() => setActiveTab('reports')}
          />
        );
      case 'add':
        return (
            <AddTransaction 
                onAdd={addTransaction} 
                onUpdate={handleUpdateTransaction}
                transactionToEdit={editingTransaction}
                onCancel={() => {
                    setEditingTransaction(null);
                    setActiveTab('dashboard');
                }}
                recurringTemplates={recurringTemplates}
                goals={goals}
                transactions={transactions}
            />
        );
      case 'list':
        return (
          <TransactionList 
            transactions={transactions} 
            onDelete={deleteTransaction}
            onEdit={(t) => { setEditingTransaction(t); setActiveTab('add'); }}
            savedFilters={savedFilters}
            onSaveFilter={handleSaveFilter}
            onDeleteFilter={handleDeleteFilter}
          />
        );
      case 'goals':
        return <Goals goals={goals} setGoals={handleSetGoals} onAddTransaction={addTransaction} />;
      case 'bills':
        return <Bills bills={bills} setBills={handleSetBills} onPayBill={payBill} transactions={transactions} />;
      case 'insights':
        return <Insights expenses={transactions} budgets={budgets} />;
      case 'reports':
        return <Reports transactions={transactions} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-white text-gray-900 font-sans">
      <main className="flex-1 overflow-hidden relative">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      {activeTab !== 'add' && !isLoading && (
        <nav className="flex justify-around items-center bg-white border-t border-gray-100 h-16 pb-safe sticky bottom-0 z-20 shadow-soft">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === 'dashboard' ? 'text-black' : 'text-gray-300'}`}
          >
            <LayoutDashboard size={20} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
          </button>
          
          <button
            onClick={() => setActiveTab('list')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === 'list' ? 'text-black' : 'text-gray-300'}`}
          >
            <History size={20} strokeWidth={activeTab === 'list' ? 2.5 : 2} />
          </button>

           <div className="relative -top-6">
              <button
                onClick={() => {
                    setEditingTransaction(null);
                    setActiveTab('add');
                }}
                className="bg-black text-white rounded-full p-4 shadow-xl hover:scale-105 active:scale-95 transition-all border-4 border-white"
              >
                <Plus size={24} />
              </button>
           </div>

           <button
            onClick={() => setActiveTab('bills')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === 'bills' ? 'text-black' : 'text-gray-300'}`}
          >
            <Calendar size={20} strokeWidth={activeTab === 'bills' ? 2.5 : 2} />
          </button>

           <button
            onClick={() => setActiveTab('reports')}
             className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === 'reports' ? 'text-black' : 'text-gray-300'}`}
          >
             <PieChart size={20} strokeWidth={activeTab === 'reports' ? 2.5 : 2} />
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;