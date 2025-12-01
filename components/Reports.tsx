

import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Download, FileText, Filter } from 'lucide-react';
import { jsPDF } from "jspdf";

interface ReportsProps {
  transactions: Transaction[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A259FF', '#F24E1E', '#9CA3AF', '#3B82F6', '#EF4444'];

type TimeRange = 'week' | 'month' | 'year' | 'all';

const Reports: React.FC<ReportsProps> = ({ transactions }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  // Filter transactions based on range
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();

    if (timeRange === 'week') {
      cutoff.setDate(now.getDate() - 7);
    } else if (timeRange === 'month') {
      cutoff.setMonth(now.getMonth() - 1);
    } else if (timeRange === 'year') {
      cutoff.setFullYear(now.getFullYear() - 1);
    } else {
      return transactions;
    }

    return transactions.filter(t => new Date(t.date) >= cutoff);
  }, [transactions, timeRange]);

  // Derived Data: Totals
  const totals = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (t.type === 'income') acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [filteredTransactions]);

  // Derived Data: Pie Chart (Expenses by Category)
  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    filteredTransactions.filter(t => t.type === 'expense').forEach(e => {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // Derived Data: Line Chart (Trends over time)
  const lineData = useMemo(() => {
    const map = new Map<string, { date: string, income: number, expense: number }>();
    
    // Initialize dates in range if needed, but sparse data is okay for now.
    // We just aggregate by date existing in transactions.
    filteredTransactions.forEach(t => {
      if (!map.has(t.date)) {
        map.set(t.date, { date: t.date, income: 0, expense: 0 });
      }
      const entry = map.get(t.date)!;
      if (t.type === 'income') entry.income += t.amount;
      else entry.expense += t.amount;
    });

    return Array.from(map.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredTransactions]);

  // Export CSV
  const exportCSV = () => {
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Notes'];
    const rows = filteredTransactions.map(t => [
      t.date,
      `"${t.description.replace(/"/g, '""')}"`, // Escape quotes
      t.category,
      t.type,
      t.amount.toFixed(2),
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `spendwise_report_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(13, 148, 136); // brand-600
    doc.text("SpendWise AI - Financial Report", 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Period: ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);

    // Summary
    doc.setDrawColor(200);
    doc.line(14, 40, 196, 40);
    
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Summary", 14, 50);
    
    doc.setFontSize(12);
    doc.text(`Total Income: ₹${totals.income.toFixed(2)}`, 14, 60);
    doc.text(`Total Expenses: ₹${totals.expense.toFixed(2)}`, 14, 68);
    doc.text(`Net Balance: ₹${(totals.income - totals.expense).toFixed(2)}`, 14, 76);

    // Top Categories
    doc.line(14, 85, 196, 85);
    doc.setFontSize(14);
    doc.text("Top Expense Categories", 14, 95);

    let y = 105;
    pieData.slice(0, 5).forEach((item, index) => {
       doc.setFontSize(12);
       doc.text(`${index + 1}. ${item.name}: ₹${item.value.toFixed(2)}`, 14, y);
       y += 8;
    });

    // Transactions
    doc.line(14, y + 5, 196, y + 5);
    doc.setFontSize(14);
    doc.text("Recent Transactions", 14, y + 15);
    y += 25;

    doc.setFontSize(10);
    filteredTransactions.slice(0, 15).forEach((t) => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
        const prefix = t.type === 'income' ? '+' : '-';
        doc.text(`${t.date} | ${t.category} | ${t.description} | ${prefix}₹${t.amount.toFixed(2)}`, 14, y);
        y += 7;
    });

    if (filteredTransactions.length > 15) {
        doc.text("...and more in CSV export.", 14, y+5);
    }

    doc.save(`spendwise_report_${timeRange}.pdf`);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white p-4 border-b flex flex-col sticky top-0 z-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Reports</h2>
        
        {/* Filters */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          {(['week', 'month', 'year', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${
                timeRange === range ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-center">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Income</p>
                <p className="text-green-600 font-bold text-sm sm:text-lg overflow-hidden text-ellipsis">₹{totals.income.toFixed(0)}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-center">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Expense</p>
                <p className="text-red-500 font-bold text-sm sm:text-lg overflow-hidden text-ellipsis">₹{totals.expense.toFixed(0)}</p>
            </div>
             <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-center">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Net</p>
                <p className={`font-bold text-sm sm:text-lg overflow-hidden text-ellipsis ${totals.income - totals.expense >= 0 ? 'text-gray-800' : 'text-red-500'}`}>
                    ₹{(totals.income - totals.expense).toFixed(0)}
                </p>
            </div>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-3">
            <button 
                onClick={exportCSV}
                className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-50 transition-colors shadow-sm font-medium text-sm"
            >
                <Download size={16} className="text-green-600" />
                Excel (CSV)
            </button>
            <button 
                onClick={exportPDF}
                className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-50 transition-colors shadow-sm font-medium text-sm"
            >
                <FileText size={16} className="text-red-500" />
                PDF Report
            </button>
        </div>

        {/* Trend Graph */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Filter size={16} className="text-brand-500" />
                Spending Trends
            </h3>
            <div className="h-64 w-full text-xs">
                {lineData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                            dataKey="date" 
                            tickFormatter={(date) => new Date(date).getDate().toString()} 
                            stroke="#9ca3af"
                            tick={{fontSize: 10}}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis 
                            stroke="#9ca3af" 
                            tick={{fontSize: 10}} 
                            axisLine={false}
                            tickLine={false}
                        />
                        <RechartsTooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={false} name="Income" />
                        <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={false} name="Expense" />
                    </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-center px-4">
                        Not enough data for this period to show trends.
                    </div>
                )}
            </div>
        </div>

        {/* Pie Chart & Top Categories */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-2">Top Categories</h3>
            <div className="flex flex-col md:flex-row gap-4">
                {/* Chart */}
                <div className="h-48 w-full md:w-1/2">
                    {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                        </PieChart>
                        </ResponsiveContainer>
                    ) : (
                         <div className="h-full flex items-center justify-center text-gray-400">
                            No data
                        </div>
                    )}
                </div>
                
                {/* List */}
                <div className="flex-1 space-y-3">
                    {pieData.slice(0, 5).map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                <span className="text-gray-700 font-medium">{item.name}</span>
                            </div>
                            <span className="text-gray-900 font-bold">₹{item.value.toFixed(2)}</span>
                        </div>
                    ))}
                    {pieData.length > 5 && (
                        <p className="text-center text-xs text-gray-400 pt-2">+ {pieData.length - 5} more categories</p>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Reports;
