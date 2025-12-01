

export type TransactionType = 'expense' | 'income';

export enum Category {
  FOOD = 'Food',
  TRANSPORT = 'Transport',
  UTILITIES = 'Utilities',
  ENTERTAINMENT = 'Entertainment',
  SHOPPING = 'Shopping',
  HEALTH = 'Health',
  TRAVEL = 'Travel',
  BILLS = 'Bills',
  SAVINGS = 'Savings',
  OTHER = 'Other'
}

export enum IncomeCategory {
  SALARY = 'Salary',
  FREELANCE = 'Freelance',
  INVESTMENT = 'Investment',
  GIFT = 'Gift',
  OTHER = 'Other Income'
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string; // Can be Category or IncomeCategory
  date: string; // ISO String YYYY-MM-DD
  createdAt: number;
  notes?: string;
  attachment?: string; // base64
  isRecurring?: boolean;
  goalId?: string; // Linked to a specific goal
  billId?: string; // Linked to a recurring bill
}

export interface ReceiptData {
  amount?: number;
  date?: string;
  merchant?: string;
  category?: Category;
}

export type Tab = 'dashboard' | 'add' | 'list' | 'insights' | 'reports' | 'goals' | 'bills';

export type BudgetPeriod = 'monthly' | 'weekly';

export interface Budget {
  category: string;
  limit: number;
  period: BudgetPeriod;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  color: string;
  icon: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  category: Category;
  dueDateDay: number; // 1-31
  autoPay: boolean;
  lastPaidDate?: string; // ISO String YYYY-MM-DD
  logo?: string; // Optional icon/logo
  isSubscription?: boolean; // New: Distinguish between fixed bill and sub
}

export interface InsightData {
  summary: string;
  prediction: {
    nextMonthTotal: number;
    reasoning: string;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  anomalies: Array<{
    title: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  savingTips: string[];
}

export interface SubscriptionAnalysis {
  newSubscriptions: Array<{
    name: string;
    amount: number;
    frequency: string;
    reason: string;
  }>;
  priceChanges: Array<{
    name: string;
    oldAmount: number;
    newAmount: number;
    change: number;
  }>;
  redundant: Array<{
    name: string;
    reason: string;
  }>;
}

export interface FilterConfig {
  query: string;
  categories: string[];
  dateRange: { start: string; end: string };
  amountRange: { min: string; max: string };
  type: 'all' | 'expense' | 'income';
}

export interface SavedFilter {
  id: string;
  name: string;
  config: FilterConfig;
}

export interface AppNotification {
  id: string;
  type: 'alert' | 'info' | 'success' | 'warning';
  title: string;
  message: string;
  date: number; // timestamp
  read: boolean;
}