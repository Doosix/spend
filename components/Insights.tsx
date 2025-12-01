import React, { useEffect, useState } from 'react';
import { Transaction, Budget, InsightData } from '../types';
import { getSpendingInsights } from '../services/geminiService';
import { Sparkles, RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb, Activity } from 'lucide-react';

interface InsightsProps {
  expenses: Transaction[]; // Named expenses prop but expects full list
  budgets: Budget[];
}

const Insights: React.FC<InsightsProps> = ({ expenses, budgets }) => {
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchInsights = async () => {
    setLoading(true);
    const result = await getSpendingInsights(expenses, budgets);
    setData(result);
    setLoading(false);
  };

  useEffect(() => {
    if (expenses.length > 0 && !data) {
        fetchInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount if data empty

  return (
    <div className="h-full flex flex-col bg-white">
        <div className="bg-white p-6 pb-2 border-b border-gray-100 sticky top-0 z-10">
            <div className="flex items-center gap-3">
                 <div className="bg-black text-white p-2 rounded-xl">
                     <Sparkles size={20} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">AI Insights</h2>
                    <p className="text-gray-500 text-xs">Smart analysis of your finances</p>
                </div>
            </div>
        </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 pt-6 space-y-6">
        {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-6">
                <div className="relative">
                    <div className="w-16 h-16 border-2 border-gray-100 border-t-black rounded-full animate-spin"></div>
                </div>
                <p className="text-gray-400 font-medium text-xs tracking-widest uppercase animate-pulse">Analyzing...</p>
            </div>
        ) : data ? (
            <>
                {/* Prediction Card */}
                <div className="bg-black text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">30-Day Forecast</h3>
                            <div className={`px-2 py-1 rounded-md flex items-center gap-1 text-xs font-bold ${
                                data.prediction.trend === 'increasing' ? 'bg-white/10 text-red-300' : 
                                data.prediction.trend === 'decreasing' ? 'bg-white/10 text-green-300' : 'bg-white/10 text-gray-300'
                            }`}>
                                {data.prediction.trend === 'increasing' && <TrendingUp size={12} />}
                                {data.prediction.trend === 'decreasing' && <TrendingDown size={12} />}
                                {data.prediction.trend === 'stable' && <Minus size={12} />}
                                <span className="capitalize">{data.prediction.trend}</span>
                            </div>
                        </div>
                        
                        <div className="flex items-baseline gap-1 mb-4">
                             <span className="text-4xl font-bold tracking-tighter">₹{data.prediction.nextMonthTotal.toLocaleString()}</span>
                             <span className="text-gray-500 text-sm">est.</span>
                        </div>
                        
                        <p className="text-gray-400 text-sm leading-relaxed border-t border-white/10 pt-4">
                            {data.prediction.reasoning}
                        </p>
                    </div>
                </div>

                {/* Summary / Analysis */}
                <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-soft">
                    <h3 className="flex items-center gap-2 text-gray-900 font-bold text-xs uppercase tracking-wider mb-4">
                        <Activity size={16} className="text-gray-400" /> Weekly Analysis
                    </h3>
                    <p className="text-gray-700 font-medium leading-relaxed text-sm">
                        {data.summary}
                    </p>
                </div>

                {/* Smart Alerts */}
                {data.anomalies && data.anomalies.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-900 text-sm ml-1">Alerts & Anomalies</h3>
                        {data.anomalies.map((alert, idx) => (
                            <div key={idx} className="rounded-2xl p-4 border border-gray-100 shadow-sm bg-gray-50 flex items-start gap-4">
                                <div className="bg-white p-2 rounded-xl shadow-sm flex-shrink-0 text-gray-900">
                                    <AlertTriangle size={18} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm">{alert.title}</h4>
                                    <p className="text-gray-500 text-xs mt-1 leading-relaxed">{alert.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Saving Tips */}
                {data.savingTips && data.savingTips.length > 0 && (
                    <div>
                         <h3 className="font-bold text-gray-900 text-sm ml-1 mb-3">Smart Tips</h3>
                         <div className="space-y-3">
                            {data.savingTips.map((tip, idx) => (
                                <div key={idx} className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100 flex gap-4 items-start">
                                    <div className="bg-black text-white p-2 rounded-full flex-shrink-0 mt-0.5">
                                        <Lightbulb size={14} />
                                    </div>
                                    <p className="text-gray-600 text-sm leading-relaxed">
                                        {tip}
                                    </p>
                                </div>
                            ))}
                         </div>
                    </div>
                )}
            </>
        ) : (
            <div className="text-center text-gray-400 py-10">
                <p className="text-sm">Add more expenses to activate AI features.</p>
            </div>
        )}
      </div>

      <div className="absolute bottom-20 right-5">
        <button 
            onClick={fetchInsights}
            disabled={loading}
            className="bg-black text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
        >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
};

export default Insights;