import React, { useState } from 'react';
import { Bill, Category, Transaction, SubscriptionAnalysis } from '../types';
import { analyzeSubscriptions } from '../services/geminiService';
import { Plus, Trash2, Zap, CheckCircle, Search } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface BillsProps {
  bills: Bill[];
  setBills: (bills: Bill[]) => void;
  onPayBill: (bill: Bill) => void;
  transactions?: Transaction[]; // Optional prop for scanning
}

const Bills: React.FC<BillsProps> = ({ bills, setBills, onPayBill, transactions = [] }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [analysis, setAnalysis] = useState<SubscriptionAnalysis | null>(null);
  
  // New Bill State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>(Category.BILLS);
  const [dueDateDay, setDueDateDay] = useState('1');
  const [autoPay, setAutoPay] = useState(false);
  const [isSubscription, setIsSubscription] = useState(true);

  const handleAddBill = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name || !amount) return;

      const newBill: Bill = {
          id: uuidv4(),
          name,
          amount: parseFloat(amount),
          category,
          dueDateDay: parseInt(dueDateDay),
          autoPay,
          isSubscription
      };

      setBills([...bills, newBill]);
      setShowAdd(false);
      resetForm();
  };

  const handleQuickAdd = (sub: { name: string, amount: number }) => {
      const newBill: Bill = {
          id: uuidv4(),
          name: sub.name,
          amount: sub.amount,
          category: Category.ENTERTAINMENT, // Default
          dueDateDay: 1, // Default
          autoPay: false,
          isSubscription: true
      };
      setBills([...bills, newBill]);
      // Remove from analysis list locally
      if (analysis) {
          setAnalysis({
              ...analysis,
              newSubscriptions: analysis.newSubscriptions.filter(s => s.name !== sub.name)
          });
      }
  };

  const scanSubscriptions = async () => {
      setIsScanning(true);
      const result = await analyzeSubscriptions(transactions, bills);
      setAnalysis(result);
      setIsScanning(false);
  }

  const resetForm = () => {
      setName('');
      setAmount('');
      setCategory(Category.BILLS);
      setDueDateDay('1');
      setAutoPay(false);
      setIsSubscription(true);
  };

  const handleDelete = (id: string) => {
      if (confirm('Delete this bill subscription?')) {
          setBills(bills.filter(b => b.id !== id));
      }
  };

  const isPaidThisMonth = (bill: Bill) => {
      if (!bill.lastPaidDate) return false;
      const last = new Date(bill.lastPaidDate);
      const now = new Date();
      return last.getMonth() === now.getMonth() && last.getFullYear() === now.getFullYear();
  };

  const getStatus = (bill: Bill) => {
      if (isPaidThisMonth(bill)) return { text: 'Paid', color: 'text-green-600', bg: 'bg-green-50' };
      
      const today = new Date().getDate();
      if (today > bill.dueDateDay) return { text: 'Overdue', color: 'text-red-600', bg: 'bg-red-50' };
      if (bill.dueDateDay - today <= 5 && bill.dueDateDay >= today) return { text: 'Renewing', color: 'text-orange-600', bg: 'bg-orange-50' };
      
      return { text: `Due ${bill.dueDateDay}th`, color: 'text-gray-500', bg: 'bg-gray-50' };
  };

  // Sort: Overdue first, then upcoming, then paid
  const sortedBills = [...bills].sort((a, b) => {
      const statusA = isPaidThisMonth(a) ? 1 : 0;
      const statusB = isPaidThisMonth(b) ? 1 : 0;
      if (statusA !== statusB) return statusA - statusB; // Paid items at bottom
      
      const today = new Date().getDate();
      const distA = a.dueDateDay >= today ? a.dueDateDay - today : 31 + (a.dueDateDay - today);
      const distB = b.dueDateDay >= today ? b.dueDateDay - today : 31 + (b.dueDateDay - today);
      return distA - distB;
  });

  const totalFixed = bills.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="h-full flex flex-col bg-white">
        <div className="bg-white p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Bills & Subs</h2>
            <div className="flex gap-2">
                <button 
                    onClick={scanSubscriptions}
                    className="p-2 bg-gray-50 text-black border border-gray-200 rounded-full hover:bg-gray-100 transition-colors relative"
                >
                    <Search size={20} className={isScanning ? "animate-pulse" : ""} />
                </button>
                <button 
                    onClick={() => setShowAdd(true)}
                    className="p-2 bg-black text-white rounded-full hover:scale-105 transition-all shadow-lg"
                >
                    <Plus size={20} />
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pb-24 space-y-6">
            
            {/* AI Analysis Result */}
            {analysis && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                    {analysis.newSubscriptions.length > 0 && (
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                            <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wide mb-3 flex items-center gap-2">
                                <Search size={14} /> Discovery
                            </h3>
                            <div className="space-y-2">
                                {analysis.newSubscriptions.map((sub, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded-xl flex items-center justify-between shadow-sm border border-gray-100">
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{sub.name}</p>
                                            <p className="text-[10px] text-gray-500">{sub.frequency} • {sub.reason}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-gray-900 text-sm">₹{sub.amount}</span>
                                            <button 
                                                onClick={() => handleQuickAdd(sub)}
                                                className="bg-black text-white p-1.5 rounded-full hover:bg-gray-800"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Summary */}
            <div className="bg-black text-white p-5 rounded-3xl shadow-xl flex items-center justify-between">
                <div>
                    <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Monthly Fixed</p>
                    <p className="text-3xl font-bold mt-1">₹{totalFixed.toFixed(0)}</p>
                </div>
                <div className="bg-white/10 p-3 rounded-full backdrop-blur-sm">
                     <Zap className="text-white" size={24} />
                </div>
            </div>

            {/* Add Form */}
            {showAdd && (
                <div className="bg-white p-5 rounded-2xl shadow-xl border border-gray-100 mb-4 animate-in fade-in slide-in-from-top-4">
                     <h3 className="font-bold text-gray-900 mb-4">Add Bill</h3>
                     <form onSubmit={handleAddBill} className="space-y-4">
                        <input 
                            type="text"
                            placeholder="Name (e.g. Netflix)"
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-900 font-bold">₹</span>
                                <input 
                                    type="number"
                                    placeholder="0"
                                    className="w-full pl-7 p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">Day</span>
                                <input 
                                    type="number"
                                    min="1" max="31"
                                    placeholder="Due"
                                    className="w-full pl-10 p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm"
                                    value={dueDateDay}
                                    onChange={e => setDueDateDay(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg flex-1 border border-gray-100">
                                <input 
                                    type="checkbox" 
                                    id="isSub"
                                    checked={isSubscription}
                                    onChange={e => setIsSubscription(e.target.checked)}
                                    className="w-4 h-4 text-black rounded focus:ring-black"
                                />
                                <label htmlFor="isSub" className="text-xs font-semibold text-gray-600">
                                    Subscription
                                </label>
                            </div>
                             <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg flex-1 border border-gray-100">
                                <input 
                                    type="checkbox" 
                                    id="autopay"
                                    checked={autoPay}
                                    onChange={e => setAutoPay(e.target.checked)}
                                    className="w-4 h-4 text-black rounded focus:ring-black"
                                />
                                <label htmlFor="autopay" className="text-xs font-semibold text-gray-600">
                                    Auto-Pay
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                             <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 text-gray-400 font-bold text-xs hover:text-black">CANCEL</button>
                             <button type="submit" className="flex-1 py-3 bg-black text-white rounded-xl font-bold shadow-md text-xs">SAVE BILL</button>
                        </div>
                     </form>
                </div>
            )}

            {/* List */}
            {bills.length === 0 && !showAdd ? (
                <div className="text-center py-10 text-gray-400">
                    <p className="text-sm">No bills tracked.</p>
                </div>
            ) : (
                sortedBills.map(bill => {
                    const status = getStatus(bill);
                    const paid = isPaidThisMonth(bill);

                    return (
                        <div key={bill.id} className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 ${paid ? 'opacity-50 grayscale' : ''}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg relative ${paid ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 text-black border border-gray-200'}`}>
                                        {bill.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm">{bill.name}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${status.bg} ${status.color}`}>
                                                {status.text}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg text-gray-900">₹{bill.amount}</p>
                                    <button onClick={() => handleDelete(bill.id)} className="text-gray-300 hover:text-black p-1">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            
                            {!paid && (
                                <button 
                                    onClick={() => onPayBill(bill)}
                                    className="w-full py-2.5 mt-1 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-colors flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={14} />
                                    MARK PAID
                                </button>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    </div>
  );
};

export default Bills;