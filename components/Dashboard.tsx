import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Transaction, Category, Budget, BudgetPeriod, Bill, AppNotification, Goal } from '../types';
import { ArrowUpRight, ArrowDownLeft, Edit2, Check, AlertTriangle, Settings, Plus, Sparkles, Calendar, ChevronRight, Bell, X, CheckCircle, Info, PieChart as PieIcon, Target, MoreHorizontal } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  expectedIncome: number;
  setExpectedIncome: (val: number) => void;
  budgets: Budget[];
  setBudgets: (budgets: Budget[]) => void;
  bills: Bill[];
  goals: Goal[];
  notifications: AppNotification[];
  markNotificationsRead: () => void;
  clearNotifications: () => void;
  onOpenAI: () => void;
  onOpenBills: () => void;
  onOpenGoals: () => void;
  onOpenReports: () => void;
}

const COLORS = ['#111827', '#4B5563', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#000000', '#6B7280', '#374151', '#F3F4F6'];

const Dashboard: React.FC<DashboardProps> = ({ 
    transactions, expectedIncome, setExpectedIncome, budgets, setBudgets, bills, goals,
    notifications, markNotificationsRead, clearNotifications,
    onOpenAI, onOpenBills, onOpenGoals, onOpenReports 
}) => {
  const [editingBudget, setEditingBudget] = useState(false);
  const [tempIncome, setTempIncome] = useState(expectedIncome.toString());
  const [showBudgetManager, setShowBudgetManager] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Derived State: Totals
  const totals = useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (t.type === 'income') {
        acc.income += t.amount;
      } else {
        acc.expense += t.amount;
      }
      return acc;
    }, { income: 0, expense: 0 });
  }, [transactions]);

  const balance = totals.income - totals.expense;
  const unreadCount = notifications.filter(n => !n.read).length;

  // Derived State: Expense Data for Chart
  const expenseData = useMemo(() => {
    const map = new Map<string, number>();
    Object.values(Category).forEach(c => map.set(c, 0));

    transactions.filter(t => t.type === 'expense').forEach(e => {
      const current = map.get(e.category) || 0;
      map.set(e.category, current + e.amount);
    });

    return Array.from(map.entries())
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const saveIncome = () => {
      const val = parseFloat(tempIncome);
      if (!isNaN(val)) {
          setExpectedIncome(val);
      }
      setEditingBudget(false);
  }

  // Budget Calculations
  const getCategorySpending = (category: string, period: BudgetPeriod) => {
      const now = new Date();
      let startDate = new Date();
      
      if (period === 'monthly') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
          // Weekly: Start from last Sunday
          startDate.setDate(now.getDate() - now.getDay());
          startDate.setHours(0,0,0,0);
      }

      return transactions
        .filter(t => t.type === 'expense' && t.category === category && new Date(t.date) >= startDate)
        .reduce((sum, t) => sum + t.amount, 0);
  };

  const activeBudgets = useMemo(() => {
      return budgets.map(b => {
          const spent = getCategorySpending(b.category, b.period);
          const percent = (spent / b.limit) * 100;
          return { ...b, spent, percent };
      }).sort((a, b) => b.percent - a.percent); // Sort by highest usage
  }, [budgets, transactions]);

  const overBudgetItems = activeBudgets.filter(b => b.spent > b.limit);

  // Bill Logic
  const unpaidBills = useMemo(() => {
    const today = new Date();
    return bills.filter(b => {
        const lastPaid = b.lastPaidDate ? new Date(b.lastPaidDate) : null;
        const isPaidThisMonth = lastPaid && lastPaid.getMonth() === today.getMonth() && lastPaid.getFullYear() === today.getFullYear();
        return !isPaidThisMonth;
    }).sort((a, b) => {
        // Sort by due date, overdue first
        const dayA = a.dueDateDay < today.getDate() ? a.dueDateDay - 31 : a.dueDateDay;
        const dayB = b.dueDateDay < today.getDate() ? b.dueDateDay - 31 : b.dueDateDay;
        return dayA - dayB;
    });
  }, [bills]);

  // Budget Manager Logic
  const handleSetBudget = (category: string, limitStr: string, period: BudgetPeriod) => {
      const limit = parseFloat(limitStr);
      const newBudgets = budgets.filter(b => b.category !== category);
      if (limit > 0) {
          newBudgets.push({ category, limit, period });
      }
      setBudgets(newBudgets);
  };

  const toggleNotifications = () => {
      if (!showNotifications && unreadCount > 0) {
          markNotificationsRead();
      }
      setShowNotifications(!showNotifications);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-white pb-20 relative">
      
      {/* Notification Overlay */}
      {showNotifications && (
          <div className="absolute top-16 right-4 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 animate-in fade-in slide-in-from-top-4 overflow-hidden ring-1 ring-black/5">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 backdrop-blur-sm">
                  <h3 className="font-bold text-gray-900">Notifications</h3>
                  {notifications.length > 0 && (
                       <button onClick={clearNotifications} className="text-xs text-black font-semibold hover:underline">Clear All</button>
                  )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-sm">No new notifications</div>
                  ) : (
                      notifications.map(n => (
                          <div key={n.id} className={`p-4 border-b border-gray-50 flex items-start gap-3 ${n.read ? 'bg-white' : 'bg-gray-50'}`}>
                              <div className={`mt-1 flex-shrink-0 ${
                                  n.type === 'alert' ? 'text-black' : 
                                  n.type === 'success' ? 'text-black' :
                                  n.type === 'warning' ? 'text-gray-600' : 'text-gray-500'
                              }`}>
                                  {n.type === 'alert' && <AlertTriangle size={16} />}
                                  {n.type === 'success' && <CheckCircle size={16} />}
                                  {n.type === 'warning' && <AlertTriangle size={16} />}
                                  {n.type === 'info' && <Info size={16} />}
                              </div>
                              <div>
                                  <h4 className="text-sm font-bold text-gray-900">{n.title}</h4>
                                  <p className="text-xs text-gray-600 leading-snug mt-0.5">{n.message}</p>
                                  <p className="text-[10px] text-gray-400 mt-2">{new Date(n.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                              </div>
                          </div>
                      ))
                  )}
              </div>
              <div onClick={() => setShowNotifications(false)} className="p-3 text-center text-xs font-medium text-gray-500 bg-gray-50 cursor-pointer hover:bg-gray-100 border-t border-gray-100">
                  Close
              </div>
          </div>
      )}

      {/* Header / Balance */}
      <div className="bg-black p-6 rounded-b-[2.5rem] shadow-soft text-white mb-6 relative z-10 mx-2 mt-2">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-sm font-medium text-gray-400">Total Balance</h2>
                <h1 className="text-4xl font-bold mt-1 tracking-tight">₹{balance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</h1>
            </div>
            <div className="flex gap-2">
                 <button 
                    onClick={onOpenReports}
                    className="bg-white/10 p-2.5 rounded-full hover:bg-white/20 transition-colors backdrop-blur-md border border-white/5"
                    title="Reports"
                >
                    <PieIcon size={18} className="text-white" />
                </button>
                <button 
                    onClick={toggleNotifications}
                    className="bg-white/10 p-2.5 rounded-full hover:bg-white/20 transition-colors backdrop-blur-md border border-white/5 relative"
                    title="Notifications"
                >
                    <Bell size={18} className="text-white" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                </button>
                <button 
                    onClick={onOpenAI}
                    className="bg-white text-black p-2.5 rounded-full hover:bg-gray-200 transition-colors shadow-lg"
                    title="AI Insights"
                >
                    <Sparkles size={18} className="text-black" />
                </button>
            </div>
        </div>
        
        <div className="flex justify-between mt-8">
            <div className="flex items-center gap-3 bg-white/5 px-4 py-3 rounded-2xl border border-white/5 flex-1 mr-2">
                <div className="p-1.5 bg-white/10 rounded-full">
                    <ArrowDownLeft size={16} className="text-green-400" />
                </div>
                <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Income</p>
                    <p className="font-semibold text-lg">₹{totals.income.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                </div>
            </div>
            <div className="flex items-center gap-3 bg-white/5 px-4 py-3 rounded-2xl border border-white/5 flex-1 ml-2">
                <div className="p-1.5 bg-white/10 rounded-full">
                    <ArrowUpRight size={16} className="text-red-400" />
                </div>
                <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Spent</p>
                    <p className="font-semibold text-lg">₹{totals.expense.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                </div>
            </div>
        </div>
      </div>

      <div className="px-5 space-y-8">
        
        {/* Alerts */}
        {overBudgetItems.length > 0 && (
            <div className="bg-white border border-gray-100 shadow-soft p-4 rounded-2xl flex items-start gap-3">
                <div className="bg-black text-white p-2 rounded-lg">
                    <AlertTriangle size={18} />
                </div>
                <div>
                    <h3 className="text-gray-900 font-bold text-sm">Budget Alert</h3>
                    <p className="text-gray-500 text-xs mt-1">
                        Exceeded limits: {overBudgetItems.map(b => b.category).join(', ')}.
                    </p>
                </div>
            </div>
        )}

        {/* Goals Widget */}
        {goals.length > 0 && (
             <div className="bg-white">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        Savings
                    </h3>
                    <button onClick={onOpenGoals} className="text-gray-400 hover:text-black transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                    {goals.map(goal => {
                        const percent = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
                        return (
                             <div key={goal.id} className="min-w-[160px] bg-white rounded-2xl p-4 flex flex-col gap-3 border border-gray-100 shadow-sm">
                                 <div className="flex items-center gap-2">
                                     <div className={`w-2 h-2 rounded-full bg-black`}></div>
                                     <p className="font-semibold text-xs text-gray-600 truncate uppercase tracking-wider">{goal.name}</p>
                                 </div>
                                 <p className="text-xl font-bold text-gray-900">₹{goal.currentAmount.toLocaleString()}</p>
                                 <div className="w-full bg-gray-100 rounded-full h-1">
                                     <div className={`h-1 rounded-full bg-black`} style={{ width: `${percent}%` }}></div>
                                 </div>
                             </div>
                        )
                    })}
                </div>
             </div>
        )}

        {/* Bills Widget */}
        <div className="bg-white">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    Upcoming Bills
                </h3>
                <button onClick={onOpenBills} className="text-gray-400 hover:text-black transition-colors">
                    <ChevronRight size={20} />
                </button>
            </div>
            {unpaidBills.length > 0 ? (
                <div className="space-y-3">
                    {unpaidBills.slice(0, 2).map(bill => {
                        const today = new Date().getDate();
                        const isOverdue = today > bill.dueDateDay;
                        const isDueSoon = bill.dueDateDay - today <= 3 && bill.dueDateDay - today >= 0;
                        
                        return (
                            <div key={bill.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-200 text-gray-900 font-bold text-sm shadow-sm">
                                        {bill.dueDateDay}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{bill.name}</p>
                                        <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-600 font-medium' : isDueSoon ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                                            {isOverdue ? 'Overdue' : isDueSoon ? 'Due Soon' : `Due on ${bill.dueDateDay}th`}
                                        </p>
                                    </div>
                                </div>
                                <span className="font-bold text-gray-900">₹{bill.amount}</span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-6 bg-gray-50 rounded-2xl border border-gray-100 text-gray-400 text-sm">
                    No pending bills.
                </div>
            )}
        </div>

        {/* Budget Section */}
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Budgets</h3>
                <button 
                    onClick={() => setShowBudgetManager(!showBudgetManager)}
                    className="text-black text-xs font-bold border border-gray-200 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-colors uppercase tracking-wide"
                >
                    {showBudgetManager ? 'Done' : 'Edit'}
                </button>
            </div>

            {showBudgetManager ? (
                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 divide-y divide-gray-100">
                    <div className="p-4 bg-gray-50 rounded-t-2xl">
                        <p className="text-xs text-gray-500">Set limits for each category to track your spending.</p>
                    </div>
                    {Object.values(Category).map(cat => {
                        const existing = budgets.find(b => b.category === cat);
                        return (
                            <div key={cat} className="p-4 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900 text-sm">{cat}</span>
                                    <select 
                                        className="text-xs bg-white border border-gray-200 rounded px-2 py-1 text-gray-600 focus:outline-none"
                                        value={existing?.period || 'monthly'}
                                        onChange={(e) => handleSetBudget(cat, existing?.limit.toString() || '0', e.target.value as BudgetPeriod)}
                                    >
                                        <option value="monthly">Monthly</option>
                                        <option value="weekly">Weekly</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400 font-bold text-sm">₹</span>
                                    <input 
                                        type="number" 
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-black focus:outline-none transition-colors"
                                        placeholder="Limit"
                                        value={existing?.limit || ''}
                                        onChange={(e) => handleSetBudget(cat, e.target.value, existing?.period || 'monthly')}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-4">
                     {/* Global Income Progress */}
                    <div className="bg-white p-5 rounded-2xl shadow-soft border border-gray-100">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold text-gray-900 text-sm">Monthly Goal</h4>
                            {editingBudget ? (
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        className="w-24 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-black"
                                        value={tempIncome}
                                        onChange={e => setTempIncome(e.target.value)}
                                        autoFocus
                                    />
                                    <button onClick={saveIncome} className="text-black"><Check size={16} /></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 cursor-pointer group" onClick={() => { setTempIncome(expectedIncome.toString()); setEditingBudget(true); }}>
                                    <span className="text-xs font-medium text-gray-500 group-hover:text-black">₹{expectedIncome.toLocaleString()}</span>
                                    <Edit2 size={12} className="text-gray-300 group-hover:text-black" />
                                </div>
                            )}
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                             <div 
                                className={`h-2 rounded-full ${totals.income >= expectedIncome ? 'bg-black' : 'bg-gray-400'}`} 
                                style={{ width: `${Math.min((totals.income / (expectedIncome || 1)) * 100, 100)}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Category Budgets List */}
                    {activeBudgets.length > 0 ? (
                        activeBudgets.map(budget => {
                            const isOver = budget.spent > budget.limit;
                            const isNear = budget.percent > 80;
                            const colorClass = isOver ? 'bg-red-500' : isNear ? 'bg-gray-800' : 'bg-black';
                            
                            return (
                                <div key={budget.category} className="bg-white p-4 rounded-2xl border border-gray-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-semibold text-gray-900 text-sm">{budget.category}</span>
                                        <span className={`text-xs font-medium ${isOver ? 'text-red-600' : 'text-gray-500'}`}>
                                            ₹{budget.spent.toFixed(0)} / ₹{budget.limit}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                            className={`h-1.5 rounded-full transition-all duration-500 ${colorClass}`} 
                                            style={{ width: `${Math.min(budget.percent, 100)}%` }}
                                        ></div>
                                    </div>
                                    {isOver && <p className="text-[10px] text-red-500 mt-1 font-medium">Exceeded by ₹{(budget.spent - budget.limit).toFixed(0)}</p>}
                                </div>
                            );
                        })
                    ) : (
                        <div 
                            onClick={() => setShowBudgetManager(true)}
                            className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 hover:border-gray-400 transition-all"
                        >
                            <Plus size={24} className="mb-2 opacity-50" />
                            <p className="text-sm font-medium">Create Budget</p>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Breakdown Chart */}
        <div className="">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Breakdown</h3>
            <div className="h-64 w-full bg-white rounded-2xl shadow-soft p-4 border border-gray-100">
                {expenseData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                        data={expenseData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {expenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip 
                        formatter={(value: number) => `₹${value.toFixed(2)}`} 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: '#1f2937', fontWeight: 600, fontSize: '12px' }}
                    />
                    <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '11px', color: '#4b5563'}} />
                    </PieChart>
                </ResponsiveContainer>
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">
                        No expense data yet
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;