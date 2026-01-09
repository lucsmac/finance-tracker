# AutoMone App

Personal finance management app with daily budget tracking based on monthly estimates.

## What is AutoMone?

AutoMone uses a unique approach to budget management centered on a **Daily Standard Value** (Valor Diário Padrão). Instead of traditional monthly budgets, you define how much you expect to spend per month in each category, and the system calculates a fixed daily budget. Each day, you compare your actual spending against this standard to see if you're on track.

### Core Concept: Daily Standard Value

The app calculates a daily spending standard based on your monthly estimates:

```
Daily Standard = Sum of Monthly Estimates / 30
```

**Example:**
- Groceries: R$ 800/month
- Transport: R$ 300/month
- Pharmacy: R$ 150/month
- Food & Outings: R$ 450/month

**Total:** R$ 1,700/month → **Daily Standard:** R$ 56.67/day

This value stays **fixed throughout the month**. Each day, you track your actual spending against this standard:
- Spent R$ 40? You saved R$ 16.67 today!
- Spent R$ 80? You're R$ 23.33 over budget today.

The key insight: the daily standard doesn't change based on your actual spending. It's your consistent reference point, not a decreasing budget.

### Key Features

- **Daily Budget Tracking**: Compare daily spending vs. standard with visual feedback
- **Balance Projection**: See if your money will last until next paycheck with color-coded calendar (green/yellow/red)
- **Estimates Manager**: Configure monthly spending estimates by category
- **Fixed Expenses & Installments**: Track bills and payment plans separately (these don't affect your daily budget)
- **Investments**: Manage your investment portfolio separate from available balance
- **Financial Goals**: Set and track savings/investment goals
- **Transaction Management**: Log and categorize all income and expenses
- **Monthly Calendar**: Visual timeline of past spending and future projections
- **Reports**: Analyze spending patterns and performance over time

### Project Status

This is currently a **frontend prototype using mock data**. No backend or data persistence is implemented yet. The app demonstrates the UI and business logic with sample transactions.

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install
# or
npm install
```

### Development

```bash
# Start development server
pnpm run dev
# or
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
# Build for production
pnpm run build
# or
npm run build
```

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS v4** - Utility-first CSS framework
- **shadcn/ui** - Accessible component library
- **Radix UI** - Unstyled UI primitives
- **Lucide React** - Icon library
- **date-fns** - Date manipulation
- **Recharts** - Chart library

## Project Structure

```
src/
├── main.tsx                 # App entry point
├── app/
│   ├── App.tsx             # Root component with navigation
│   ├── components/         # Feature components
│   │   ├── Dashboard.tsx   # Main dashboard
│   │   ├── MonthCalendar.tsx
│   │   ├── TransactionsList.tsx
│   │   ├── EstimatesManager.tsx
│   │   ├── CommitmentsView.tsx
│   │   ├── InvestmentsView.tsx
│   │   ├── GoalsView.tsx
│   │   ├── ProjectionView.tsx
│   │   ├── ui/             # Reusable UI components
│   │   └── figma/          # Figma-specific components
│   └── data/
│       └── mockData.ts     # Sample data and utilities
└── styles/                 # Global styles
```

## Documentation

- **`requisitos.md`** - Complete requirements specification (in Portuguese)
- **`CLAUDE.md`** - Developer guidance for AI assistants and future contributors

## Design

Original Figma design: https://www.figma.com/design/eUwNIkbExgdKjAlQn9QFcb/Finance-Tracker-App

## Language

This app is in **Portuguese (Brazilian)**. All UI text, labels, and default data are in Portuguese.

## License

This project is for personal use.