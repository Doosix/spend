

import React, { useState } from 'react';
import { Goal, Transaction, Category } from '../types';
import { Plus, Trash2, Target } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface GoalsProps {
  goals: Goal[];
  setGoals: (goals: Goal[]) => void;
  onAddTransaction: (t: Transaction) => void;
}

const COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];

const Goals: React.FC<GoalsProps> = ({ goals, setGoals, onAddTransaction }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [showDeposit, setShowDeposit] = useState<string | null>(null); // goal id
  
  // New Goal Form State
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');

  // Deposit State
  const [depositAmount, setDepositAmount] = useState('');

  const handleCreateGoal = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newGoalName || !newGoalAmount) return;

      const goal: Goal = {
          id: uuidv4(),
          name: newGoalName,
          targetAmount: parseFloat(newGoalAmount),
          currentAmount: 0,
          deadline: newGoalDeadline,
          color: COLORS[Math.floor(Math.random() * COLORS.length)] || 'bg-blue-500',
          icon: 'target'
      };

      setGoals([...goals, goal]);
      setShowAdd(false);
      setNewGoalName('');
      setNewGoalAmount('');
      setNewGoalDeadline('');
  };

  const handleDelete = (id: string) => {
      if (confirm('Delete this goal? Transaction history will remain.')) {
          setGoals(goals.filter(g => g.id !== id));
      }
  };

  const handleDeposit = (e: React.FormEvent, goal: Goal) => {
      e.preventDefault();
      const amount = parseFloat(depositAmount);
      if (amount <= 0) return;

      const transaction: Transaction = {
          id: uuidv4(),
          type: 'expense', // It's an expense from the "Spending" wallet to "Savings" wallet
          amount: amount,
          description: `Deposit: ${goal.name}`,
          category: Category.SAVINGS,
          date: new Date().toISOString().split('T')[0] as string,
          createdAt: Date.now(),
          goalId: goal.id,
          isRecurring: false // User can make this recurring via the Add page later if they want
      };

      onAddTransaction(transaction);
      setShowDeposit(null);
      setDepositAmount('');
  };

  const getProgressStatus = (goal: Goal) => {
      if (goal.currentAmount >= goal.targetAmount) return { text: 'Completed', color: 'text-green-600' };
      if (!goal.deadline) return { text: 'In Progress', color: 'text-blue-600' };

      const totalDays = (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 3600 * 24);
      if (totalDays < 0) return { text: 'Overdue', color: 'text-red-600' };
      
      return { text: `${Math.ceil(totalDays)} days left`, color: 'text-gray-500' };
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
        <div className="bg-white p-4 border-b flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-xl font-bold text-gray-900">Savings Goals</h2>
            <button 
                onClick={() => setShowAdd(true)}
                className="p-2 bg-brand-50 text-brand-600 rounded-full hover:bg-brand-100 transition-colors"
            >
                <Plus size={24} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
            {goals.length === 0 && !showAdd && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <Target size={48} className="mb-2 opacity-20" />
                    <p>No goals set yet.</p>
                    <p className="text-sm">Tap + to start saving!</p>
                </div>
            )}

            {showAdd && (
                <div className="bg-white p-4 rounded-2xl shadow-lg border border-brand-100 mb-4 animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-bold text-gray-800 mb-3">Create New Goal</h3>
                    <form onSubmit={handleCreateGoal} className="space-y-3">
                        <input 
                            type="text"
                            placeholder="Goal Name (e.g. New Car)"
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            value={newGoalName}
                            onChange={e => setNewGoalName(e.target.value)}
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                <input 
                                    type="number"
                                    placeholder="Target"
                                    className="w-full pl-7 p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    value={newGoalAmount}
                                    onChange={e => setNewGoalAmount(e.target.value)}
                                />
                            </div>
                             <div className="relative flex-1">
                                <input 
                                    type="date"
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    value={newGoalDeadline}
                                    onChange={e => setNewGoalDeadline(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                             <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 text-gray-500 font-medium">Cancel</button>
                             <button type="submit" className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-md shadow-brand-200">Create Goal</button>
                        </div>
                    </form>
                </div>
            )}

            {goals.map(goal => {
                const percent = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
                const status = getProgressStatus(goal);
                
                return (
                    <div key={goal.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
                         {/* Progress Bar Background */}
                         <div className="absolute bottom-0 left-0 h-1 bg-gray-100 w-full">
                             <div className={`h-full ${goal.color}`} style={{ width: `${percent}%` }}></div>
                         </div>

                         <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full ${goal.color} bg-opacity-10 flex items-center justify-center text-${goal.color.split('-')[1]}-600`}>
                                        <Target size={20} className={goal.color.replace('bg-', 'text-')} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">{goal.name}</h3>
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className={status.color}>{status.text}</span>
                                            {goal.deadline && <span className="text-gray-300">|</span>}
                                            {goal.deadline && <span className="text-gray-400">{new Date(goal.deadline).toLocaleDateString()}</span>}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(goal.id)} className="text-gray-300 hover:text-red-400">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="mt-4 mb-2">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-2xl font-bold text-gray-900">₹{goal.currentAmount.toFixed(0)}</span>
                                    <span className="text-sm font-medium text-gray-400 mb-1">of ₹{goal.targetAmount}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div className={`h-2 rounded-full transition-all duration-1000 ${goal.color}`} style={{ width: `${percent}%` }}></div>
                                </div>
                            </div>

                            {showDeposit === goal.id ? (
                                <form onSubmit={(e) => handleDeposit(e, goal)} className="mt-4 flex gap-2 animate-in fade-in slide-in-from-bottom-2">
                                     <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                        <input 
                                            type="number" 
                                            autoFocus
                                            placeholder="Amount"
                                            className="w-full pl-6 p-2 bg-gray-50 rounded-lg border border-brand-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                            value={depositAmount}
                                            onChange={e => setDepositAmount(e.target.value)}
                                        />
                                     </div>
                                     <button type="submit" className="bg-brand-600 text-white px-4 rounded-lg font-medium text-sm">Save</button>
                                     <button type="button" onClick={() => setShowDeposit(null)} className="text-gray-400 px-2"><Trash2 size={16}/></button>
                                </form>
                            ) : (
                                <div className="flex gap-2 mt-4">
                                    <button 
                                        onClick={() => setShowDeposit(goal.id)}
                                        className="flex-1 py-2 bg-gray-50 text-gray-700 font-semibold rounded-lg text-sm border border-gray-100 hover:bg-gray-100 flex items-center justify-center gap-1"
                                    >
                                        <Plus size={16} /> Add Funds
                                    </button>
                                </div>
                            )}
                         </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export default Goals;
