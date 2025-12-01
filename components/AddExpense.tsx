
import React, { useState, useRef, useEffect } from 'react';
import { Category, IncomeCategory, Transaction, TransactionType, ReceiptData, Goal } from '../types';
import { parseReceiptImage, compressImage, suggestCategory } from '../services/geminiService';
import { Camera, Upload, Loader2, Sparkles, X, Repeat, FileText, Target, AlertTriangle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface AddTransactionProps {
  onAdd: (transaction: Transaction) => void;
  onUpdate?: (transaction: Transaction) => void;
  transactionToEdit?: Transaction | null;
  onCancel: () => void;
  recurringTemplates: Transaction[];
  goals: Goal[];
  transactions: Transaction[]; // Added for duplicate detection
}

const AddTransaction: React.FC<AddTransactionProps> = ({ 
    onAdd, onUpdate, transactionToEdit, onCancel, 
    recurringTemplates, goals, transactions 
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(Category.FOOD);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [attachment, setAttachment] = useState<string | undefined>(undefined);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [aiCategorized, setAiCategorized] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form if editing
  useEffect(() => {
      if (transactionToEdit) {
          setType(transactionToEdit.type);
          setAmount(transactionToEdit.amount.toString());
          setDescription(transactionToEdit.description);
          setCategory(transactionToEdit.category);
          setDate(transactionToEdit.date);
          setNotes(transactionToEdit.notes || '');
          setIsRecurring(transactionToEdit.isRecurring || false);
          setAttachment(transactionToEdit.attachment);
          setSelectedGoalId(transactionToEdit.goalId || '');
      }
  }, [transactionToEdit]);

  // Reset category when type switches
  useEffect(() => {
    if (!transactionToEdit) {
        if (type === 'expense') {
            setCategory(Category.FOOD);
            setAiCategorized(false);
        } else {
            setCategory(IncomeCategory.SALARY);
        }
    }
  }, [type, transactionToEdit]);

  // Auto-categorize effect (Debounced)
  useEffect(() => {
    // Only run for expenses, when description has length, and avoid running instantly on edit load
    if (!description || description.length < 3 || type === 'income') return;

    // If we are editing and the description hasn't changed from the original, don't re-categorize
    if (transactionToEdit && description === transactionToEdit.description) return;

    const timer = setTimeout(async () => {
      setIsCategorizing(true);
      try {
        const suggested = await suggestCategory(description);
        // Only update if it's a valid category and different from current
        if (suggested) {
          setCategory(suggested);
          setAiCategorized(true);
          setTimeout(() => setAiCategorized(false), 2000);
        }
      } catch (err) {
        console.error("Auto-categorization failed", err);
      } finally {
        setIsCategorizing(false);
      }
    }, 500); // 500ms debounce for snappier feel

    return () => clearTimeout(timer);
  }, [description, type, transactionToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    const transactionData: Transaction = {
      id: transactionToEdit ? transactionToEdit.id : uuidv4(),
      type,
      amount: parseFloat(amount),
      description,
      category,
      date: (date || new Date().toISOString().split('T')[0]) as string,
      createdAt: transactionToEdit ? transactionToEdit.createdAt : Date.now(),
      ...(notes && { notes }),
      ...(attachment && { attachment }),
      ...(isRecurring && { isRecurring }),
      ...((category === Category.SAVINGS && selectedGoalId) && { goalId: selectedGoalId }),
      ...(transactionToEdit?.billId && { billId: transactionToEdit.billId })
    };

    if (transactionToEdit && onUpdate) {
        onUpdate(transactionData);
    } else {
        onAdd(transactionData);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsProcessing(true);
      setDuplicateWarning(null);

      try {
        const base64 = await compressImage(file);
        setAttachment(base64); 
        
        if (type === 'expense') {
             const data: ReceiptData = await parseReceiptImage(base64);
            if (data.amount) setAmount(data.amount.toString());
            if (data.merchant) setDescription(data.merchant);
            if (data.date) setDate(data.date);
            if (data.category) {
                setCategory(data.category);
                setAiCategorized(true);
                setTimeout(() => setAiCategorized(false), 3000);
            }

            // Duplicate Detection
            if (data.amount && data.date) {
                const potentialDup = transactions.find(t =>
                    t.type === 'expense' &&
                    data.amount && Math.abs(t.amount - data.amount) < 0.01 &&
                    t.date === data.date &&
                    t.id !== transactionToEdit?.id
                );
                if (potentialDup) {
                    setDuplicateWarning(`Potential duplicate detected! You have a transaction for ₹${data.amount} on ${data.date} (${potentialDup.description}).`);
                }
            }
        }
      } catch (err) {
        console.error("Failed to process attachment", err);
        alert("Could not process the image.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const applyTemplate = (t: Transaction) => {
      setType(t.type);
      setAmount(t.amount.toString());
      setDescription(t.description);
      setCategory(t.category);
      setIsRecurring(true);
      if (t.goalId) setSelectedGoalId(t.goalId);
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
        <div className="p-4 flex items-center justify-between sticky top-0 bg-white z-20">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                {transactionToEdit ? 'Edit Transaction' : 'New Entry'}
            </h2>
            <button onClick={onCancel} className="p-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-full transition-colors">
                <X size={24} />
            </button>
        </div>

      <div className="flex-1 overflow-y-auto pb-20">
        
        {/* Type Toggle */}
        <div className="px-6 mb-6">
            <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                    onClick={() => setType('expense')}
                    className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${type === 'expense' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Expense
                </button>
                <button 
                    onClick={() => setType('income')}
                    className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${type === 'income' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Income
                </button>
            </div>
        </div>

        {/* Quick Add Recurring - Only show if adding new */}
        {!transactionToEdit && recurringTemplates.length > 0 && (
            <div className="px-6 mb-6 overflow-x-auto no-scrollbar">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Recent</p>
                <div className="flex gap-2">
                    {recurringTemplates.map(t => (
                        <button 
                            key={t.id}
                            onClick={() => applyTemplate(t)}
                            className="flex-shrink-0 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs font-semibold active:bg-gray-100 hover:border-gray-400 transition-colors"
                        >
                            {t.description}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* Duplicate Warning */}
        {duplicateWarning && (
            <div className="px-6 mb-4">
                <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl flex gap-3 items-start">
                    <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={18} />
                    <div>
                        <p className="text-orange-800 font-bold text-xs">Duplicate Detected</p>
                        <p className="text-orange-700 text-[11px] mt-0.5 leading-snug">{duplicateWarning}</p>
                    </div>
                </div>
            </div>
        )}

        {/* Receipt/Image Area */}
        <div className="px-6 mb-8">
            <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border border-dashed rounded-2xl h-32 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all group ${attachment ? 'border-black bg-gray-50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
            >
                {isProcessing ? (
                    <div className="flex flex-col items-center animate-pulse">
                         <Loader2 className="animate-spin text-black mb-2" size={24} />
                         <p className="text-gray-500 text-xs font-medium">Analyzing...</p>
                    </div>
                ) : attachment ? (
                    <div className="relative w-full h-full p-2">
                         <img src={`data:image/jpeg;base64,${attachment}`} alt="Receipt" className="w-full h-full object-contain rounded-lg" />
                    </div>
                ) : (
                    <>
                        <div className="flex gap-3 mb-2 text-gray-400 group-hover:text-gray-600 transition-colors">
                            <Camera size={24} />
                            <Upload size={24} />
                        </div>
                        <p className="text-gray-400 text-xs font-medium group-hover:text-gray-600">Scan Receipt</p>
                    </>
                )}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    capture="environment"
                    onChange={handleFileChange}
                />
            </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Amount</label>
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-900 font-bold text-2xl">₹</span>
                <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-4 text-3xl font-bold text-gray-900 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black placeholder-gray-300"
                    placeholder="0"
                    required
                />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Details</label>
            <div className="relative">
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all font-medium text-gray-900"
                    placeholder={type === 'income' ? "Source (e.g. Salary)" : "Merchant (e.g. Uber)"}
                    required
                />
                {(isCategorizing) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="animate-spin text-black" size={16} />
                    </div>
                )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    Category
                </label>
                <div className="relative">
                     <select
                        value={category}
                        onChange={(e) => { setCategory(e.target.value); setAiCategorized(false); }}
                        className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-black appearance-none transition-all duration-300 text-sm font-medium ${aiCategorized ? 'bg-gray-50 border-black ring-2 ring-black ring-offset-1' : 'bg-white border-gray-200'}`}
                    >
                        {type === 'expense' ? (
                            Object.values(Category).map((c) => <option key={c} value={c}>{c}</option>)
                        ) : (
                            Object.values(IncomeCategory).map((c) => <option key={c} value={c}>{c}</option>)
                        )}
                    </select>
                    {/* Sparkle overlay when auto-categorized */}
                    {aiCategorized && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none animate-in fade-in zoom-in spin-in-180 duration-500">
                            <Sparkles size={18} className="text-black" fill="currentColor" />
                        </div>
                    )}
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Date</label>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm font-medium"
                    required
                />
            </div>
          </div>

          {category === Category.SAVINGS && goals.length > 0 && (
              <div className="animate-in fade-in slide-in-from-top-2">
                 <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Link Goal</label>
                 <div className="relative">
                    <Target size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black" />
                    <select
                        value={selectedGoalId}
                        onChange={(e) => setSelectedGoalId(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 text-gray-900 rounded-xl border border-gray-200 focus:outline-none focus:border-black focus:ring-1 focus:ring-black appearance-none font-medium text-sm"
                    >
                        <option value="">-- Select Goal --</option>
                        {goals.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                </div>
              </div>
          )}

           {/* Notes */}
           <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Notes</label>
            <div className="relative">
                <div className="absolute top-3 left-3 text-gray-400">
                    <FileText size={18} />
                </div>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-black focus:ring-1 focus:ring-black min-h-[80px] text-sm"
                    placeholder="Optional details..."
                />
            </div>
          </div>

          {/* Recurring Toggle */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
             <div className={`p-2 rounded-lg ${isRecurring ? 'bg-black text-white' : 'bg-white text-gray-400 border border-gray-200'}`}>
                <Repeat size={18} />
             </div>
             <div className="flex-1">
                 <p className="font-semibold text-gray-900 text-sm">Recurring</p>
                 <p className="text-[10px] text-gray-500">
                     Repeat this transaction automatically?
                 </p>
             </div>
             <input 
                type="checkbox" 
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-black hover:bg-gray-900 text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
          >
            {transactionToEdit ? 'Save Changes' : `Add ${type === 'expense' ? 'Expense' : 'Income'}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddTransaction;
