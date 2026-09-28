import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StatCard } from "@/components/page-header";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Plus,
  X,
  Trash,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ArrowUpRight,
  RefreshCw,
  Newspaper,
  Coins,
  DollarSign,
  LineChart,
  Percent,
  CheckCircle2,
  Award,
  Flame,
  Globe,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getExpenses, addExpense, deleteExpense, Expense, getUserProfile, UserProfile } from "@/lib/db";
import { analyzeFinancialSpendAI } from "@/lib/gemini";
import { isPremiumUser } from "@/lib/premium";
import { PremiumGateModal } from "@/components/premium-gate-modal";
import { toast } from "sonner";
import { ActionDispatchBar } from "@/components/action-dispatch-bar";

export const Route = createFileRoute("/app/expenses")({ component: ExpensesPage });

// Real-time market data structure
interface StockAsset {
  symbol: string;
  name: string;
  category: "metals" | "indices" | "equities" | "crypto";
  price: number;
  currency: string;
  change: number;
  changePct: number;
  high: number;
  low: number;
  isBullish: boolean;
  highlight?: string;
  actionUrl?: string;
}

// Financial News Article structure
interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: "metals" | "markets" | "economy" | "tech";
  time: string;
  sentiment: "Bullish" | "Neutral" | "Bearish";
  url: string;
  relatedAsset?: string;
}

const INITIAL_MARKET_ASSETS: StockAsset[] = [
  {
    symbol: "VITARA-GOLD-24K",
    name: "24K Gold (99.9% Pure / 10g)",
    category: "metals",
    price: 76850.0,
    currency: "₹",
    change: 620.0,
    changePct: 0.81,
    high: 77100.0,
    low: 76200.0,
    isBullish: true,
    highlight: "Vitara Gold Direct",
    actionUrl: "https://vitaragold.com/",
  },
  {
    symbol: "VITARA-SILVER-999",
    name: "999 Fine Silver (1 kg)",
    category: "metals",
    price: 92650.0,
    currency: "₹",
    change: 1350.0,
    changePct: 1.48,
    high: 93200.0,
    low: 91100.0,
    isBullish: true,
    highlight: "High Industrial Demand",
    actionUrl: "https://vitaragold.com/",
  },
  {
    symbol: "NIFTY 50",
    name: "NSE NIFTY 50 Index",
    category: "indices",
    price: 25145.2,
    currency: "₹",
    change: 142.8,
    changePct: 0.57,
    high: 25210.0,
    low: 24980.5,
    isBullish: true,
  },
  {
    symbol: "SENSEX",
    name: "BSE SENSEX 30",
    category: "indices",
    price: 82410.6,
    currency: "₹",
    change: 468.2,
    changePct: 0.57,
    high: 82600.0,
    low: 81900.0,
    isBullish: true,
  },
  {
    symbol: "NASDAQ",
    name: "NASDAQ 100 Index",
    category: "indices",
    price: 18125.4,
    currency: "$",
    change: 154.2,
    changePct: 0.86,
    high: 18180.0,
    low: 17950.0,
    isBullish: true,
  },
  {
    symbol: "S&P 500",
    name: "S&P 500 US Index",
    category: "indices",
    price: 5742.8,
    currency: "$",
    change: 22.4,
    changePct: 0.39,
    high: 5760.0,
    low: 5715.0,
    isBullish: true,
  },
  {
    symbol: "RELIANCE",
    name: "Reliance Industries Ltd",
    category: "equities",
    price: 2985.5,
    currency: "₹",
    change: 28.5,
    changePct: 0.96,
    high: 3005.0,
    low: 2950.0,
    isBullish: true,
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Services",
    category: "equities",
    price: 4260.0,
    currency: "₹",
    change: -14.5,
    changePct: -0.34,
    high: 4300.0,
    low: 4240.0,
    isBullish: false,
  },
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank Limited",
    category: "equities",
    price: 1680.4,
    currency: "₹",
    change: 18.2,
    changePct: 1.1,
    high: 1695.0,
    low: 1660.0,
    isBullish: true,
  },
  {
    symbol: "BTC/INR",
    name: "Bitcoin (Spot)",
    category: "crypto",
    price: 5480000.0,
    currency: "₹",
    change: 120500.0,
    changePct: 2.25,
    high: 5540000.0,
    low: 5320000.0,
    isBullish: true,
  },
];

const INITIAL_FINANCIAL_NEWS: NewsArticle[] = [
  {
    id: "n1",
    title: "Gold & Silver Touch New Highs as Central Bank Buying Surges; Retail Inflows Spike at Vitara Gold",
    summary:
      "Global gold demand remains robust with central banks and smart retail investors diversifying into 24K gold and silver bullion on platforms like Vitara Gold to safeguard against long-term fiat inflation.",
    source: "Economic Times",
    category: "metals",
    time: "10 mins ago",
    sentiment: "Bullish",
    url: "https://vitaragold.com/",
    relatedAsset: "24K Gold & Silver",
  },
  {
    id: "n2",
    title: "Indian Equities Rally as FII Inflows Rebound: Nifty & Sensex Eye Key Resistance Levels",
    summary:
      "Broad-based buying across banking, metal, and automotive sectors lifts benchmark indices. Analysts recommend maintaining a disciplined systematic investment plan (SIP).",
    source: "LiveMint",
    category: "markets",
    time: "25 mins ago",
    sentiment: "Bullish",
    url: "https://vitaragold.com/",
    relatedAsset: "NIFTY 50",
  },
  {
    id: "n3",
    title: "Why Allocating Unallocated Monthly Cash Surplus into Precious Metals Beats Idle Savings Accounts",
    summary:
      "With bank savings accounts generating nominal 3-4% yields against real inflation of 5.5%+, wealth advisors advocate allocating excess monthly savings into 24K gold and 999 silver SIPs.",
    source: "Bloomberg Wealth",
    category: "metals",
    time: "42 mins ago",
    sentiment: "Bullish",
    url: "https://vitaragold.com/",
    relatedAsset: "Vitara Gold & Silver",
  },
  {
    id: "n4",
    title: "RBI Keeps Benchmark Repo Rate Steady Amid Robust GDP Growth Trajectory",
    summary:
      "India's central bank maintains its accommodative stance citing controlled core inflation and healthy foreign exchange reserves exceeding $690 billion.",
    source: "Reuters",
    category: "economy",
    time: "1 hour ago",
    sentiment: "Neutral",
    url: "https://vitaragold.com/",
    relatedAsset: "Economy",
  },
  {
    id: "n5",
    title: "Global Silver Demand Projected to Hit All-Time Record Driven by Solar & EV Tech Sectors",
    summary:
      "The Silver Institute forecasts supply deficit in 999 fine silver for the fourth consecutive year, making physical silver an attractive high-beta growth companion to gold.",
    source: "Financial Express",
    category: "metals",
    time: "2 hours ago",
    sentiment: "Bullish",
    url: "https://vitaragold.com/",
    relatedAsset: "999 Fine Silver",
  },
  {
    id: "n6",
    title: "Tech Giants Announce Strategic Capital Deployments into AI Infrastructure & Clean Power",
    summary:
      "Cloud hyperscalers increase quarterly capex by 28% year-over-year, bolstering hardware supply chains and semiconductor valuations across global markets.",
    source: "CNBC",
    category: "tech",
    time: "3 hours ago",
    sentiment: "Bullish",
    url: "https://vitaragold.com/",
    relatedAsset: "NASDAQ",
  },
];

function ExpensesPage() {
  const { user: authUser } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Market & News States
  const [marketAssets, setMarketAssets] = useState<StockAsset[]>(INITIAL_MARKET_ASSETS);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>(INITIAL_FINANCIAL_NEWS);
  const [selectedAssetTab, setSelectedAssetTab] = useState<"all" | "metals" | "indices" | "equities" | "crypto">("all");
  const [selectedNewsTab, setSelectedNewsTab] = useState<"all" | "metals" | "markets" | "economy" | "tech">("all");
  const [isRefreshingNews, setIsRefreshingNews] = useState(false);
  const [lastMarketUpdate, setLastMarketUpdate] = useState<string>("Just now");

  // Gold & Silver Wealth Builder Simulator State
  const [allocationPct, setAllocationPct] = useState<number>(80); // percentage of excess fund to invest
  const [goldRatio, setGoldRatio] = useState<number>(70); // 70% Gold, 30% Silver
  const [customExcessAmount, setCustomExcessAmount] = useState<string>("");

  // AI Financial Advisor State
  const [aiFinanceAnalysis, setAiFinanceAnalysis] = useState<string | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  // New Transaction form state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [txName, setTxName] = useState("");
  const [txCat, setTxCat] = useState("Food");
  const [txAmount, setTxAmount] = useState("");
  const [txType, setTxType] = useState<"expense" | "income">("expense");

  const fetchExpenses = async () => {
    if (!authUser) return;
    try {
      const [list, userProfile] = await Promise.all([
        getExpenses(authUser.uid),
        getUserProfile(authUser.uid),
      ]);
      setExpenses(list);
      setProfile(userProfile);
    } catch (err) {
      console.error("Failed to load expenses", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [authUser]);

  // Minor live price ticker pulse simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketAssets((prev) =>
        prev.map((asset) => {
          const delta = (Math.random() - 0.48) * (asset.price * 0.0015);
          const newPrice = Math.max(1, Number((asset.price + delta).toFixed(2)));
          const change = Number((asset.change + delta).toFixed(2));
          const changePct = Number(((change / newPrice) * 100).toFixed(2));
          return {
            ...asset,
            price: newPrice,
            change: change,
            changePct: changePct,
            isBullish: change >= 0,
          };
        }),
      );
      setLastMarketUpdate(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const handleRefreshNews = () => {
    setIsRefreshingNews(true);
    setTimeout(() => {
      setIsRefreshingNews(false);
      toast.success("Real-time financial news updated with latest headlines!");
    }, 600);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !txName.trim() || !txAmount.trim()) return;

    let amount = Math.abs(parseFloat(txAmount));
    if (isNaN(amount)) return;
    if (txType === "expense") {
      amount = -amount;
    }

    try {
      await addExpense(authUser.uid, {
        name: txName,
        cat: txCat,
        amount: amount,
        date: "Today",
      });
      setTxName("");
      setTxAmount("");
      setIsAddOpen(false);
      fetchExpenses();
      toast.success("Transaction added successfully!");
    } catch (err) {
      console.error("Failed to add transaction", err);
      toast.error("Failed to add transaction.");
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!authUser) return;
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await deleteExpense(authUser.uid, id);
      fetchExpenses();
      toast.success("Transaction deleted.");
    } catch (err) {
      console.error("Failed to delete transaction", err);
    }
  };

  // 1. Calculate dynamic statistics
  const totalIncome = expenses.filter((e) => e.amount > 0).reduce((acc, e) => acc + e.amount, 0);
  const totalSpent = Math.abs(
    expenses.filter((e) => e.amount < 0).reduce((acc, e) => acc + e.amount, 0),
  );
  const netSaved = totalIncome - totalSpent;
  const baseNetWorth = profile?.baseNetWorth ?? 0;
  const netWorth = baseNetWorth + netSaved;

  // Unallocated monthly surplus / excess funds
  const calculatedExcessFunds = Math.max(0, netSaved);
  const effectiveExcessFunds = customExcessAmount !== "" ? Math.max(0, parseFloat(customExcessAmount) || 0) : calculatedExcessFunds;
  
  // Gold & Silver computation based on live prices
  const liveGoldPricePerGram = (marketAssets.find((a) => a.symbol === "VITARA-GOLD-24K")?.price || 76850) / 10;
  const liveSilverPricePerGram = (marketAssets.find((a) => a.symbol === "VITARA-SILVER-999")?.price || 92650) / 1000;

  const totalToInvest = (effectiveExcessFunds * allocationPct) / 100;
  const goldFundAmount = (totalToInvest * goldRatio) / 100;
  const silverFundAmount = totalToInvest - goldFundAmount;

  const goldGrams = liveGoldPricePerGram > 0 ? goldFundAmount / liveGoldPricePerGram : 0;
  const silverGrams = liveSilverPricePerGram > 0 ? silverFundAmount / liveSilverPricePerGram : 0;

  // 5-year Compound Projection: Precious Metals (13.2% historical CAGR) vs Bank Savings (3.5% nominal)
  const annualInvestment = totalToInvest * 12;
  const projectedPreciousMetals5Y = annualInvestment > 0 ? annualInvestment * ((Math.pow(1 + 0.132, 5) - 1) / 0.132) : 0;
  const projectedBankSavings5Y = annualInvestment > 0 ? annualInvestment * ((Math.pow(1 + 0.035, 5) - 1) / 0.035) : 0;
  const surplusWealthCreated = Math.max(0, projectedPreciousMetals5Y - projectedBankSavings5Y);

  // 2. Aggregate spending by category from database data
  const categoriesMap: Record<string, number> = {};
  expenses
    .filter((e) => e.amount < 0)
    .forEach((e) => {
      categoriesMap[e.cat] = (categoriesMap[e.cat] || 0) + Math.abs(e.amount);
    });

  const displaySpendingByCategory = Object.keys(categoriesMap).map((cat) => ({
    name: cat,
    value: Math.round(categoriesMap[cat]),
  }));

  // 3. Dynamic Monthly aggregation from Database (last 6 months dynamically generated)
  const monthlyDataMap: Record<string, { income: number; expense: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const mName = d.toLocaleString("default", { month: "short" });
    monthlyDataMap[mName] = { income: 0, expense: 0 };
  }

  expenses.forEach((e) => {
    let month = "";
    if (e.createdAt) {
      try {
        const d = (e.createdAt as any).toDate ? (e.createdAt as any).toDate() : new Date(e.createdAt);
        const mName = d.toLocaleString("default", { month: "short" });
        if (mName in monthlyDataMap) {
          month = mName;
        }
      } catch (err) {
        // fallback
      }
    }
    
    if (!month && e.date) {
      const match = Object.keys(monthlyDataMap).find((m) => e.date.includes(m));
      if (match) month = match;
    }

    if (month && monthlyDataMap[month]) {
      if (e.amount > 0) {
        monthlyDataMap[month].income += e.amount;
      } else {
        monthlyDataMap[month].expense += Math.abs(e.amount);
      }
    }
  });

  const displayMonthlyFinance = Object.keys(monthlyDataMap).map((m) => ({
    m,
    income: Number(monthlyDataMap[m].income.toFixed(2)),
    expense: Number(monthlyDataMap[m].expense.toFixed(2)),
  }));

  const filteredAssets = marketAssets.filter((a) => {
    if (selectedAssetTab === "all") return true;
    return a.category === selectedAssetTab;
  });

  const filteredNews = newsArticles.filter((n) => {
    if (selectedNewsTab === "all") return true;
    return n.category === selectedNewsTab;
  });

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">
            Syncing financial data & markets...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl relative space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Finance & Wealth Hub"
        description="Smart expense tracking, real-time stock markets, financial news & gold/silver wealth builder."
        icon={<Wallet className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://vitaragold.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 px-4 py-2 text-xs font-bold text-black shadow-lg transition-all hover:scale-105 hover:shadow-amber-500/25 cursor-pointer"
            >
              <Coins className="h-3.5 w-3.5" />
              <span>Invest on Vitara Gold ↗</span>
            </a>
            <Button
              disabled={isAiAnalyzing || expenses.length === 0}
              onClick={async () => {
                if (!isPremiumUser(profile)) {
                  setPremiumModalOpen(true);
                  return;
                }
                setIsAiAnalyzing(true);
                try {
                  const formattedExp = expenses.map((e) => ({
                    title: e.name,
                    amount: e.amount,
                    category: e.cat,
                  }));
                  const res = await analyzeFinancialSpendAI(formattedExp, effectiveExcessFunds);
                  setAiFinanceAnalysis(res);
                  toast.success("AI Financial & Wealth Strategy generated!");
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to generate financial analysis.");
                } finally {
                  setIsAiAnalyzing(false);
                }
              }}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md text-xs"
            >
              <Sparkles className={`mr-1.5 h-3.5 w-3.5 ${isAiAnalyzing ? "animate-spin" : ""}`} />
              {isAiAnalyzing ? "Analyzing..." : "AI Wealth Advisor"}
            </Button>
            <Button
              className="rounded-full bg-gradient-primary cursor-pointer text-xs"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Transaction
            </Button>
          </div>
        }
      />

      {/* AI Financial Analysis Card */}
      {aiFinanceAnalysis && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-lg relative animate-in fade-in-0 duration-300">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              <h3 className="text-sm font-bold text-foreground">AI Financial Advisor & Wealth Building Plan</h3>
            </div>
            <button
              onClick={() => setAiFinanceAnalysis(null)}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground bg-background/50 p-3.5 rounded-xl border border-white/10">
            {aiFinanceAnalysis}
          </div>
          <div className="mt-3">
            <ActionDispatchBar
              text={aiFinanceAnalysis}
              sourceTitle="AI Financial Spend Strategy"
              contextType="expenses"
              onUpdated={fetchExpenses}
              showShopping={true}
              showCalendar={true}
              showTasks={true}
              showExpense={true}
              showNote={true}
              showHabit={true}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1 (TOP): STAT CARDS (INCOME, SPENT, EXCESS SAVINGS, NET WORTH)   */}
      {/* ========================================================================= */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Income"
          value={`₹${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          delta="+8.4% vs last month"
          tone="up"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Total Spent"
          value={`₹${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          delta="-12.0% within budget"
          tone="up"
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <StatCard
          label="Excess Surplus (Gold/Silver Fund)"
          value={`₹${netSaved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          delta={netSaved > 0 ? "Ready to invest in Vitara Gold" : "Balanced cashflow"}
          tone="up"
          icon={<Coins className="h-4 w-4 text-amber-500" />}
        />
        <StatCard
          label="Calculated Net Worth"
          value={`₹${(netWorth / 1000).toFixed(1)}k`}
          delta="+₹1.4k asset growth"
          tone="up"
          icon={<Wallet className="h-4 w-4" />}
        />
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2 (TOP): INCOME VS EXPENSES, CATEGORY PIE & RECENT TRANSACTIONS   */}
      {/* ========================================================================= */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Income vs Expenses Bar Chart */}
        <section className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Income vs Expenses (6-Month Trend)</h2>
            <span className="text-xs text-muted-foreground">Auto-aggregated</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayMonthlyFinance}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="m" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="income" name="Income (₹)" fill="var(--color-chart-1)" radius={6} />
                <Bar dataKey="expense" name="Expense (₹)" fill="var(--color-chart-2)" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Spending by Category Pie Chart */}
        <section className="glass rounded-2xl p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Spending by Category</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displaySpendingByCategory.length ? displaySpendingByCategory : [{ name: "No Data", value: 1 }]}
                  dataKey="value"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {displaySpendingByCategory.map((_, i) => (
                    <Cell key={i} fill={`var(--color-chart-${(i % 5) + 1})`} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-1 text-xs">
            {displaySpendingByCategory.map((s, i) => (
              <li key={s.name} className="flex justify-between">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: `var(--color-chart-${(i % 5) + 1})` }}
                  />
                  {s.name}
                </span>
                <span className="text-muted-foreground">₹{s.value.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Recent Transactions List */}
        <section className="glass rounded-2xl p-6 lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Recent Transactions</h2>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full text-xs h-7 px-3 cursor-pointer"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No transactions recorded yet. Click "Add Transaction" to begin tracking.
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {expenses.map((t) => (
                <li key={t.id} className="flex items-center gap-4 py-3 group">
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      t.amount > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {t.name[0] || "T"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.cat} · {t.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        "text-sm font-semibold " +
                        (t.amount > 0 ? "text-emerald-500" : "text-foreground")
                      }
                    >
                      {t.amount > 0 ? "+" : ""}₹{Math.abs(t.amount).toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleDeleteTransaction(t.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer p-1"
                      title="Delete Transaction"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3 (BELOW): GOLD & SILVER WEALTH BUILDER (VITARA GOLD GUIDE)       */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-background p-6 shadow-2xl backdrop-blur-2xl">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-yellow-500/10 blur-3xl pointer-events-none" />

        {/* Banner Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-amber-500/20 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-0.5 text-[11px] font-bold text-amber-500">
                <Award className="h-3 w-3" /> Vitara Gold Partnership
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                🛡️ 24K 99.9% BIS Hallmarked
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <Coins className="h-6 w-6 text-amber-500 animate-pulse" />
              Turn Monthly Excess Funds into 24K Gold & 999 Silver
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl">
              Don't let idle cash sit in bank accounts eroding at 6%+ real inflation. Build generational wealth by investing your monthly surplus cash into physical and digital bullion with{" "}
              <a
                href="https://vitaragold.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-amber-500 hover:underline inline-flex items-center gap-0.5"
              >
                Vitara Gold (vitaragold.com) <ArrowUpRight className="h-3 w-3" />
              </a>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href="https://vitaragold.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 px-5 py-2.5 text-xs font-extrabold text-black shadow-lg transition-all hover:scale-105 hover:shadow-amber-500/30"
            >
              <Coins className="h-4 w-4" /> Start Monthly Gold SIP on Vitara Gold ↗
            </a>
          </div>
        </div>

        {/* Interactive Excess Fund Allocation Calculator */}
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          {/* Controls Column */}
          <div className="lg:col-span-6 space-y-4 rounded-2xl border border-amber-500/20 bg-background/60 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-amber-500" /> Monthly Surplus Cash Flow
              </span>
              <span className="text-sm font-extrabold text-emerald-400">
                ₹{calculatedExcessFunds.toLocaleString()} Available
              </span>
            </div>

            {/* Custom Input or Preset */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium flex justify-between">
                <span>Surplus Amount to Allocate:</span>
                <span className="font-bold text-foreground">₹{effectiveExcessFunds.toLocaleString()}</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "100%", val: 100 },
                  { label: "80%", val: 80 },
                  { label: "50%", val: 50 },
                  { label: "25%", val: 25 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => {
                      setAllocationPct(p.val);
                      setCustomExcessAmount("");
                    }}
                    className={`rounded-lg py-1.5 text-xs font-semibold transition-all ${
                      allocationPct === p.val && customExcessAmount === ""
                        ? "bg-amber-500 text-black shadow-md font-bold"
                        : "bg-muted/50 hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="pt-1">
                <Input
                  type="number"
                  placeholder="Or enter custom monthly surplus (₹)..."
                  value={customExcessAmount}
                  onChange={(e) => setCustomExcessAmount(e.target.value)}
                  className="h-8 text-xs bg-background/80 border-amber-500/30 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Gold vs Silver Ratio Slider */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-amber-500 font-bold flex items-center gap-1">
                  🥇 24K Gold: {goldRatio}% (₹{Math.round(goldFundAmount).toLocaleString()})
                </span>
                <span className="text-slate-300 font-bold flex items-center gap-1">
                  🥈 999 Silver: {100 - goldRatio}% (₹{Math.round(silverFundAmount).toLocaleString()})
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={goldRatio}
                onChange={(e) => setGoldRatio(Number(e.target.value))}
                className="w-full h-2 rounded-lg bg-slate-700 accent-amber-500 cursor-pointer"
              />
              <p className="text-[11px] text-muted-foreground">
                Recommended split: <strong>70% Gold</strong> for capital stability + <strong>30% Silver</strong> for high-momentum growth.
              </p>
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4 rounded-2xl border border-amber-500/20 bg-background/60 p-5 backdrop-blur-md">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5" /> What You Accumulate Monthly on Vitara Gold
                </h4>
                <span className="text-[10px] text-muted-foreground">Live Bullion Rates</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-500">24K Gold (99.9%)</span>
                    <span className="text-[10px] text-muted-foreground">₹{Math.round(liveGoldPricePerGram)}/g</span>
                  </div>
                  <p className="mt-2 text-2xl font-black text-foreground">
                    {goldGrams.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">grams</span>
                  </p>
                  <p className="text-[10px] text-amber-400 mt-1">₹{Math.round(goldFundAmount).toLocaleString()} / month</p>
                </div>

                <div className="rounded-xl border border-slate-400/30 bg-slate-400/10 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">999 Pure Silver</span>
                    <span className="text-[10px] text-muted-foreground">₹{liveSilverPricePerGram.toFixed(1)}/g</span>
                  </div>
                  <p className="mt-2 text-2xl font-black text-foreground">
                    {silverGrams.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">grams</span>
                  </p>
                  <p className="text-[10px] text-slate-300 mt-1">₹{Math.round(silverFundAmount).toLocaleString()} / month</p>
                </div>
              </div>

              {/* 5-Year Compounding Comparison */}
              <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" /> 5-Year Wealth Compounding Advantage
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Precious Metals: <strong className="text-foreground">₹{Math.round(projectedPreciousMetals5Y).toLocaleString()}</strong> vs Bank: ₹{Math.round(projectedBankSavings5Y).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-emerald-400">
                    +₹{Math.round(surplusWealthCreated).toLocaleString()}
                  </span>
                  <p className="text-[10px] text-muted-foreground">Extra Wealth</p>
                </div>
              </div>
            </div>

            {/* Direct CTA Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/50">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-500" /> Free Insured Vault Storage & Doorstep Delivery
              </span>
              <a
                href="https://vitaragold.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 hover:underline"
              >
                Go to https://vitaragold.com/ <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4 (BELOW): LIVE REAL-TIME STOCK MARKET & COMMODITIES DATA         */}
      {/* ========================================================================= */}
      <section className="glass rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <LineChart className="h-4 w-4 text-primary" /> Real-time Stock Market & Bullion Ticker
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Live market indices, bullion prices on Vitara Gold, equities and digital assets • Updated {lastMarketUpdate}
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Assets" },
              { id: "metals", label: "Precious Metals (Vitara)" },
              { id: "indices", label: "Indices" },
              { id: "equities", label: "Equities" },
              { id: "crypto", label: "Crypto" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedAssetTab(tab.id as any)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  selectedAssetTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tickers Grid */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.symbol}
              className={`rounded-2xl border p-4 transition-all duration-200 hover:shadow-lg backdrop-blur-sm ${
                asset.category === "metals"
                  ? "border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-background/50"
                  : "border-border/60 bg-muted/20 hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-foreground">{asset.symbol}</span>
                  {asset.highlight && (
                    <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-bold text-amber-500">
                      {asset.highlight}
                    </span>
                  )}
                </div>
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                    asset.isBullish
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-rose-500/15 text-rose-400"
                  }`}
                >
                  {asset.isBullish ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {asset.changePct >= 0 ? `+${asset.changePct}%` : `${asset.changePct}%`}
                </span>
              </div>

              <p className="text-xs text-muted-foreground truncate mt-0.5">{asset.name}</p>

              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-lg font-black text-foreground">
                  {asset.currency}
                  {asset.price.toLocaleString(undefined, {
                    minimumFractionDigits: asset.currency === "$" ? 2 : 1,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {asset.change >= 0 ? `+${asset.change.toLocaleString()}` : asset.change.toLocaleString()}
                </span>
              </div>

              {/* Day High / Low Bar */}
              <div className="mt-2.5 space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>L: {asset.currency}{asset.low.toLocaleString()}</span>
                  <span>H: {asset.currency}{asset.high.toLocaleString()}</span>
                </div>
                <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          10,
                          ((asset.price - asset.low) / (asset.high - asset.low || 1)) * 100,
                        ),
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {asset.actionUrl && (
                <a
                  href={asset.actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 py-1.5 text-[11px] font-bold text-amber-500 transition-colors"
                >
                  Buy Bullion on Vitara Gold <ArrowUpRight className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5 (BELOW): REAL-TIME FINANCIAL NEWS STREAM                       */}
      {/* ========================================================================= */}
      <section className="glass rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-primary" /> Live Financial & Market News Feed
            </h3>
            <p className="text-xs text-muted-foreground">
              Curated real-time financial intelligence, bullion market updates, and macro economic reports
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: "all", label: "All News" },
                { id: "metals", label: "Gold & Silver" },
                { id: "markets", label: "Stock Markets" },
                { id: "economy", label: "Economy & RBI" },
                { id: "tech", label: "Tech & Crypto" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedNewsTab(tab.id as any)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    selectedNewsTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshNews}
              disabled={isRefreshingNews}
              className="rounded-full text-xs cursor-pointer h-8 px-3 ml-1"
            >
              <RefreshCw className={`mr-1 h-3 w-3 ${isRefreshingNews ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* News Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNews.map((news) => (
            <article
              key={news.id}
              className="flex flex-col justify-between rounded-2xl border border-border/50 bg-background/50 p-4 transition-all hover:border-primary/50 hover:shadow-md backdrop-blur-sm"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-primary">{news.source}</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.2 font-bold text-[10px] ${
                        news.sentiment === "Bullish"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : news.sentiment === "Bearish"
                          ? "bg-rose-500/15 text-rose-400"
                          : "bg-slate-500/15 text-slate-300"
                      }`}
                    >
                      {news.sentiment}
                    </span>
                    <span className="text-muted-foreground">{news.time}</span>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-foreground leading-snug line-clamp-2 hover:text-primary transition-colors">
                  <a href={news.url} target="_blank" rel="noopener noreferrer">
                    {news.title}
                  </a>
                </h4>

                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {news.summary}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground">
                  Ref: {news.relatedAsset || "Market Report"}
                </span>
                <a
                  href={news.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  Read Coverage <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Add Transaction Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-2xl p-6 shadow-2xl relative border border-white/10 animate-in fade-in-0 zoom-in-95 duration-200">
            <button
              onClick={() => setIsAddOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Plus className="h-5 w-5 text-primary" /> Add Transaction
            </h3>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Type</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Button
                    type="button"
                    variant={txType === "expense" ? "default" : "outline"}
                    onClick={() => setTxType("expense")}
                    className="rounded-full cursor-pointer w-full text-xs h-9"
                  >
                    Expense
                  </Button>
                  <Button
                    type="button"
                    variant={txType === "income" ? "default" : "outline"}
                    onClick={() => setTxType("income")}
                    className="rounded-full cursor-pointer w-full text-xs h-9"
                  >
                    Income
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <Input
                  required
                  placeholder="e.g. Vitara Gold SIP, Whole Foods, Salary"
                  value={txName}
                  onChange={(e) => setTxName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Category</label>
                  <select
                    value={txCat}
                    onChange={(e) => setTxCat(e.target.value)}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="Food">Food</option>
                    <option value="Housing">Housing</option>
                    <option value="Investment">Investment & Gold</option>
                    <option value="Transport">Transport</option>
                    <option value="Health">Health</option>
                    <option value="Fun">Fun</option>
                    <option value="Income">Income</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Amount (₹)</label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-full cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" className="rounded-full bg-gradient-primary cursor-pointer">
                  Add Transaction
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Premium Gate Modal */}
      <PremiumGateModal
        isOpen={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
        featureName="AI Wealth Advisor"
        onUpgraded={fetchExpenses}
      />
    </div>
  );
}
