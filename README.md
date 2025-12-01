# SpendWise AI - Personal Finance Management

A modern, AI-powered personal finance management application built with React, TypeScript, and Vite. Track expenses, manage bills, set financial goals, and gain insights into your spending patterns with intelligent AI assistance.

## Features

- 📊 **Dashboard**: Overview of your financial health
- 💰 **Expense Tracking**: Log and categorize your expenses
- 🧾 **Bills Management**: Track recurring bills and payments
- 🎯 **Financial Goals**: Set and monitor your savings targets
- 📈 **Insights**: AI-powered spending analysis and recommendations
- 📋 **Reports**: Detailed financial reports and trends
- 🔗 **Supabase Integration**: Real-time data synchronization

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Supabase (Database & Authentication)
- **AI**: Google Gemini API for intelligent insights
- **Styling**: Modern CSS/Tailwind (configurable)
- **Build Tool**: Vite for fast development and building

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account (for backend services)
- Gemini API key (for AI features)

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd spendwise-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory and configure the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Gemini AI API
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL setup script in your Supabase SQL editor:
   ```bash
   # Copy and execute the contents of supabase_setup.sql
   ```
3. Configure authentication and any additional security policies

### 5. Run the development server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── Dashboard.tsx    # Main dashboard
│   │   ├── ExpenseList.tsx  # Expense tracking
│   │   ├── Bills.tsx        # Bills management
│   │   ├── Goals.tsx        # Financial goals
│   │   ├── Insights.tsx     # AI insights
│   │   └── Reports.tsx      # Financial reports
│   ├── services/            # API and external services
│   │   ├── supabaseClient.ts # Supabase configuration
│   │   ├── api.ts          # API utilities
│   │   └── geminiService.ts # Gemini AI integration
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # App entry point
│   └── types.ts            # TypeScript type definitions
├── public/                 # Static assets
├── index.html             # HTML template
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
└── package.json           # Dependencies and scripts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email [your-email] or create an issue in this repository.
