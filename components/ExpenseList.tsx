import React, { useMemo, useState, useEffect } from 'react';
import { Transaction, Category, IncomeCategory, FilterConfig, SavedFilter } from '../types';
import { Coffee, ShoppingBag, Car, Zap, Activity, HelpCircle, Film, Trash2, Briefcase, TrendingUp, Gift, FileText, Image as ImageIcon, Plane, Search, X, Save, Tag, SlidersHorizontal, Edit2, MoreVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  savedFilters: SavedFilter[];
  onSaveFilter: (filter: SavedFilter) => void;
  onDeleteFilter: (id: string) => void;
}

const getIcon = (category: string) => {
  switch (category) {
    // Expense
    case 'Food': return <Coffee size={18} />;
    case 'Shopping': return <ShoppingBag size={18} />;
    case 'Transport': return <Car size={18} />;
    case 'Travel': return <Plane size={18} />;
    case 'Utilities': case 'Bills': return <Zap size={18} />;
    case 'Health': return <Activity size={18} />;
    case 'Entertainment': return <Film size={18} />;
    // Income
    case 'Salary': return <Briefcase size={18} />;
    case 'Investment': return <TrendingUp size={18} />;
    case 'Gift': return <Gift size={18} />;
    default: return <HelpCircle size={18} />;
  }
};

const INITIAL_FILTER: FilterConfig = {
    query: '',
    categories: [],
    dateRange: { start: '', end: '' },
    amountRange: { min: '', max: '' },
    type: 'all'
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete, onEdit, savedFilters, onSaveFilter, onDeleteFilter }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  
  // Search & Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [filterConfig, setFilterConfig] = useState<FilterConfig>(INITIAL_FILTER);
  const [newFilterName, setNewFilterName] = useState('');
  const [isSavingFilter, setIsSavingFilter] = useState(false);

  // Close menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => setMenuOpenId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Derived filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
        // Text Search
        if (filterConfig.query) {
            const q = filterConfig.query.toLowerCase();
            const match = 
                t.description.toLowerCase().includes(q) || 
                t.category.toLowerCase().includes(q) ||
                (t.notes && t.notes.toLowerCase().includes(q)) ||
                t.amount.toString().includes(q);
            if (!match) return false;
        }

        // Type
        if (filterConfig.type !== 'all') {
            if (t.type !== filterConfig.type) return false;
        }

        // Categories
        if (filterConfig.categories.length > 0) {
            if (!filterConfig.categories.includes(t.category)) return false;
        }

        // Date Range
        if (filterConfig.dateRange.start && t.date < filterConfig.dateRange.start) return false;
        if (filterConfig.dateRange.end && t.date > filterConfig.dateRange.end) return false;

        // Amount Range
        if (filterConfig.amountRange.min && t.amount < parseFloat(filterConfig.amountRange.min)) return false;
        if (filterConfig.amountRange.max && t.amount > parseFloat(filterConfig.amountRange.max)) return false;

        return true;
    });
  }, [transactions, filterConfig]);

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    filteredTransactions.forEach(e => {
      if (!groups[e.date]) groups[e.date] = [];
      groups[e.date]!.push(e);
    });
    // Sort dates descending
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTransactions]);

  const toggleExpand = (id: string) => {
      setExpandedId(expandedId === id ? null : id);
  }

  const handleApplySavedFilter = (saved: SavedFilter) => {
      setFilterConfig(saved.config);
  }

  const handleSaveCurrentFilter = () => {
      if (!newFilterName) return;
      const newFilter: SavedFilter = {
          id: uuidv4(),
          name: newFilterName,
          config: { ...filterConfig }
      };
      onSaveFilter(newFilter);
      setIsSavingFilter(false);
      setNewFilterName('');
  }

  const toggleCategory = (cat: string) => {
      setFilterConfig(prev => {
          const exists = prev.categories.includes(cat);
          return {
              ...prev,
              categories: exists 
                ? prev.categories.filter(c => c !== cat)
                : [...prev.categories, cat]
          };
      });
  }

  const activeFilterCount = useMemo(() => {
      let count = 0;
      if (filterConfig.type !== 'all') count++;
      if (filterConfig.categories.length > 0) count++;
      if (filterConfig.dateRange.start || filterConfig.dateRange.end) count++;
      if (filterConfig.amountRange.min || filterConfig.amountRange.max) count++;
      return count;
  }, [filterConfig]);

  return (
    <div className="h-full flex flex-col bg-white">
        
        {/* Search & Filter Header */}
        <div className="bg-white sticky top-0 z-20 border-b border-gray-100">
            <div className="p-4 space-y-3">
                {/* Search Bar Row */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search..."
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                            value={filterConfig.query}
                            onChange={(e) => setFilterConfig({ ...filterConfig, query: e.target.value })}
                        />
                        {filterConfig.query && (
                            <button 
                                onClick={() => setFilterConfig({ ...filterConfig, query: '' })}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2.5 rounded-xl border transition-colors flex items-center justify-center relative ${showFilters || activeFilterCount > 0 ? 'bg-black border-black text-white' : 'bg-white border-gray-200 text-gray-600'}`}
                    >
                        <SlidersHorizontal size={18} />
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-gray-500 rounded-full border border-white"></span>
                        )}
                    </button>
                </div>

                {/* Saved Filters Chips */}
                {savedFilters.length > 0 && !showFilters && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {savedFilters.map(filter => (
                            <button
                                key={filter.id}
                                onClick={() => handleApplySavedFilter(filter)}
                                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 active:bg-gray-50 hover:border-gray-400 transition-colors"
                            >
                                <Tag size={12} />
                                {filter.name}
                                <span 
                                    onClick={(e) => { e.stopPropagation(); onDeleteFilter(filter.id); }}
                                    className="ml-1 text-gray-300 hover:text-red-500"
                                >
                                    <X size={12} />
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Filter Drawer */}
            {showFilters && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2">
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-4 border border-gray-100">
                        
                        {/* Type Toggle */}
                        <div className="flex bg-white p-1 rounded-lg shadow-sm border border-gray-100">
                            {(['all', 'expense', 'income'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setFilterConfig({ ...filterConfig, type: t })}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize ${filterConfig.type === t ? 'bg-black text-white' : 'text-gray-500'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">From</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-black focus:border-black"
                                    value={filterConfig.dateRange.start}
                                    onChange={e => setFilterConfig({ ...filterConfig, dateRange: { ...filterConfig.dateRange, start: e.target.value } })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">To</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-black focus:border-black"
                                    value={filterConfig.dateRange.end}
                                    onChange={e => setFilterConfig({ ...filterConfig, dateRange: { ...filterConfig.dateRange, end: e.target.value } })}
                                />
                            </div>
                        </div>

                        {/* Amount Range */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Min</label>
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                                    <input 
                                        type="number" 
                                        className="w-full bg-white border border-gray-200 rounded-lg pl-5 pr-2 py-1.5 text-xs focus:ring-1 focus:ring-black focus:border-black"
                                        value={filterConfig.amountRange.min}
                                        onChange={e => setFilterConfig({ ...filterConfig, amountRange: { ...filterConfig.amountRange, min: e.target.value } })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Max</label>
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                                    <input 
                                        type="number" 
                                        className="w-full bg-white border border-gray-200 rounded-lg pl-5 pr-2 py-1.5 text-xs focus:ring-1 focus:ring-black focus:border-black"
                                        value={filterConfig.amountRange.max}
                                        onChange={e => setFilterConfig({ ...filterConfig, amountRange: { ...filterConfig.amountRange, max: e.target.value } })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Categories */}
                        <div>
                             <label className="text-[10px] uppercase font-bold text-gray-400 mb-2 block">Categories</label>
                             <div className="flex flex-wrap gap-2">
                                 {[...Object.values(Category), ...Object.values(IncomeCategory)].map(cat => (
                                     <button
                                        key={cat}
                                        onClick={() => toggleCategory(cat)}
                                        className={`px-3 py-1 rounded-full text-[10px] font-medium border ${filterConfig.categories.includes(cat) ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200'}`}
                                     >
                                         {cat}
                                     </button>
                                 ))}
                             </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                            <button 
                                onClick={() => { setFilterConfig(INITIAL_FILTER); setShowFilters(false); }}
                                className="text-xs font-bold text-gray-400 hover:text-gray-600"
                            >
                                Reset
                            </button>
                            
                            <div className="flex gap-2">
                                {isSavingFilter ? (
                                    <div className="flex items-center gap-2 animate-in fade-in">
                                        <input 
                                            type="text" 
                                            placeholder="Name"
                                            className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none"
                                            value={newFilterName}
                                            onChange={e => setNewFilterName(e.target.value)}
                                            autoFocus
                                        />
                                        <button onClick={handleSaveCurrentFilter} className="text-black"><Save size={16} /></button>
                                        <button onClick={() => setIsSavingFilter(false)} className="text-gray-400"><X size={16} /></button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setIsSavingFilter(true)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        <Save size={14} /> Save
                                    </button>
                                )}
                                <button 
                                    onClick={() => setShowFilters(false)}
                                    className="px-4 py-1.5 bg-black text-white rounded-lg text-xs font-bold shadow-sm"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        
        {/* Results List */}
      <div className="flex-1 overflow-y-auto px-5 pb-24 pt-4 space-y-6">
        {groupedTransactions.length > 0 ? (
             groupedTransactions.map(([date, items]) => (
                <div key={date}>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 sticky top-0 bg-white py-2 z-10">
                        {new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </h3>
                    <div className="space-y-3">
                    {items.map((t) => {
                        const isExpanded = expandedId === t.id;
                        const isIncome = t.type === 'income';

                        return (
                            <div key={t.id} className="relative group">
                                <div 
                                    className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer active:scale-[0.99] transition-all"
                                    onClick={() => toggleExpand(t.id)}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`min-w-[42px] h-[42px] rounded-full flex items-center justify-center ${isIncome ? 'bg-gray-100 text-green-700' : 'bg-gray-50 text-gray-700'}`}>
                                            {getIcon(t.category)}
                                        </div>
                                        <div className="truncate">
                                            <p className="font-semibold text-gray-900 text-sm truncate">{t.description}</p>
                                            <p className="text-xs text-gray-500">{t.category}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold text-sm ${isIncome ? 'text-green-600' : 'text-gray-900'}`}>
                                            {isIncome ? '+' : '-'}₹{t.amount.toFixed(2)}
                                        </span>
                                        
                                        {/* Kebab Menu Button */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === t.id ? null : t.id); }}
                                            className="p-1 text-gray-300 hover:text-black rounded-full transition-colors"
                                        >
                                            <MoreVertical size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Dropdown Menu */}
                                {menuOpenId === t.id && (
                                    <div className="absolute right-0 top-12 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 animate-in fade-in zoom-in-95 duration-100 min-w-[140px]">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onEdit(t); setMenuOpenId(null); }}
                                            className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <Edit2 size={14} /> Edit
                                        </button>
                                        <div className="h-px bg-gray-50 mx-2"></div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDelete(t.id); setMenuOpenId(null); }}
                                            className="w-full text-left px-4 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </div>
                                )}

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-2 bg-gray-50 rounded-b-2xl -mt-2 mx-1 border-x border-b border-gray-100 text-sm">
                                        <div className="pt-2 border-t border-gray-200/50 flex flex-col gap-2">
                                            {t.notes && (
                                                <div className="flex gap-2 text-xs text-gray-600 bg-white p-2 rounded-lg border border-gray-100">
                                                    <FileText size={14} className="mt-0.5 text-gray-400 flex-shrink-0" />
                                                    <p>{t.notes}</p>
                                                </div>
                                            )}
                                            {t.attachment && (
                                                <div className="mt-2">
                                                    <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-gray-400 mb-1">
                                                        <ImageIcon size={12} />
                                                        <span>Receipt</span>
                                                    </div>
                                                    <img src={`data:image/jpeg;base64,${t.attachment}`} className="max-h-48 rounded-lg border border-gray-200" alt="Attachment" />
                                                </div>
                                            )}
                                            <div className="flex justify-end mt-1">
                                                <span className="text-[10px] text-gray-400">ID: {t.id.slice(0,8)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    </div>
                </div>
            ))
        ) : (
             <div className="h-full flex flex-col items-center justify-center p-8 text-gray-400 mt-10">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                   <Search size={24} className="opacity-30" />
                </div>
                <p className="text-sm">No transactions found.</p>
                <button onClick={() => setFilterConfig(INITIAL_FILTER)} className="text-black text-xs font-bold mt-4 border-b border-black pb-0.5">Clear Filters</button>
              </div>
        )}
      </div>
    </div>
  );
};

export default TransactionList;