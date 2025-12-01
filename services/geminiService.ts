import { GoogleGenAI, Type } from "@google/genai";
import { Category, Transaction, ReceiptData, Budget, InsightData, SubscriptionAnalysis, Bill } from "../types";

// Support both Process Env (Node/Webpack) and Import Meta (Vite)
const apiKey = process.env.API_KEY || (import.meta as any).env?.VITE_GOOGLE_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to convert blob/file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url part
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const compressImage = async (file: File, maxWidth = 800, quality = 0.6): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
             reject(new Error("Canvas context not available"));
             return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get data URL
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        // Return only the base64 data part
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const parseReceiptImage = async (base64Image: string): Promise<ReceiptData> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', // Assuming jpeg/png, API is flexible with common image types
              data: base64Image
            }
          },
          {
            text: `Analyze this receipt image. Extract the total amount, the date, and the merchant name (use as description). 
            Also infer the most likely category from this list: Food, Transport, Utilities, Entertainment, Shopping, Health, Travel, Bills, Other.
            Return JSON.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            date: { type: Type.STRING, description: "YYYY-MM-DD format" },
            merchant: { type: Type.STRING },
            category: { type: Type.STRING, enum: Object.values(Category) }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return {};
    return JSON.parse(text) as ReceiptData;
  } catch (error) {
    console.error("Error parsing receipt:", error);
    return {};
  }
};

export const getSpendingInsights = async (transactions: Transaction[], budgets: Budget[]): Promise<InsightData | null> => {
  if (transactions.length === 0) return null;

  // Prepare Data Context
  const expenses = transactions.filter(t => t.type === 'expense');
  // Sort by date descending
  expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const recentExpenses = expenses.slice(0, 50); // Send last 50 for context
  const expenseSummary = recentExpenses.map(e => `${e.date}: ${e.description} - ₹${e.amount} (${e.category})`).join('\n');
  const budgetSummary = budgets.map(b => `${b.category}: ₹${b.limit}/${b.period}`).join('\n');

  // Calculate basic weekly stats for the prompt
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  const thisWeekTotal = expenses.filter(e => new Date(e.date) >= oneWeekAgo).reduce((sum, e) => sum + e.amount, 0);
  const lastWeekTotal = expenses.filter(e => new Date(e.date) >= twoWeeksAgo && new Date(e.date) < oneWeekAgo).reduce((sum, e) => sum + e.amount, 0);
  
  const comparisonText = `This week total: ₹${thisWeekTotal}. Last week total: ₹${lastWeekTotal}.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a smart financial AI. Analyze these transactions and budgets.
      
      Context:
      ${comparisonText}
      
      Budgets:
      ${budgetSummary || "No specific budgets set."}

      Recent Transactions (Last 50):
      ${expenseSummary}

      Tasks:
      1. Summary: Compare spending to last week/month. E.g., "You spent 25% more on food this week."
      2. Prediction: Predict total spending for the next 30 days based on these habits.
      3. Anomalies: Identify unusually high transactions, potential double charges, or spikes in categories.
      4. Tips: Give 3 actionable saving tips.

      Return strictly JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            prediction: {
              type: Type.OBJECT,
              properties: {
                nextMonthTotal: { type: Type.NUMBER },
                reasoning: { type: Type.STRING },
                trend: { type: Type.STRING, enum: ['increasing', 'decreasing', 'stable'] }
              }
            },
            anomalies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: ['high', 'medium', 'low'] }
                }
              }
            },
            savingTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as InsightData;
  } catch (error) {
    console.error("Error getting insights:", error);
    return null;
  }
};

export const suggestCategory = async (description: string): Promise<Category | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Categorize the expense description "${description}" into exactly one of these categories: Food, Transport, Utilities, Entertainment, Shopping, Health, Travel, Bills, Other. Return only the category name.`,
        });
        const text = response.text?.trim();
        // efficient check against enum values
        const categories = Object.values(Category);
        if (categories.includes(text as Category)) {
            return text as Category;
        }
        return Category.OTHER;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export const analyzeSubscriptions = async (transactions: Transaction[], currentBills: Bill[]): Promise<SubscriptionAnalysis | null> => {
    if (transactions.length < 5) return null;

    const expenses = transactions.filter(t => t.type === 'expense');
    const expensesStr = expenses.map(e => `${e.date}: ${e.description} (₹${e.amount})`).join('\n');
    const existingBillsStr = currentBills.map(b => b.name).join(', ');

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze these expense transactions for potential subscriptions and recurring bills.
            
            Transactions:
            ${expensesStr}

            Existing Tracked Bills:
            ${existingBillsStr}

            Task:
            1. newSubscriptions: Identify recurring payments that are NOT in the existing tracked bills list. Look for patterns in description and amount.
            2. newSubscriptions: Identify recurring payments that are NOT in the existing tracked bills list. Look for patterns in description and amount.
            3. priceChanges: Identify services where the most recent payment amount is HIGHER than the previous payment amount for the same service.
            4. redundant: Identify potential duplicate or unnecessary subscriptions (e.g. having both Spotify and Apple Music, or multiple streaming services that might be redundant).

            Return strictly JSON.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        newSubscriptions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    amount: { type: Type.NUMBER },
                                    frequency: { type: Type.STRING },
                                    reason: { type: Type.STRING }
                                }
                            }
                        },
                        priceChanges: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    oldAmount: { type: Type.NUMBER },
                                    newAmount: { type: Type.NUMBER },
                                    change: { type: Type.NUMBER }
                                }
                            }
                        },
                        redundant: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    reason: { type: Type.STRING }
                                }
                            }
                        }
                    }
                }
            }
        });

        const text = response.text;
        if(!text) return null;
        return JSON.parse(text) as SubscriptionAnalysis;

    } catch (error) {
        console.error("Subscription analysis failed:", error);
        return null;
    }
}