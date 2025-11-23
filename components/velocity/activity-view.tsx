import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, ArrowUpRight, CreditCard } from "lucide-react";

const FadeIn = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, delay }}
  >
    {children}
  </motion.div>
);

export function ActivityView({ activeUser = 'all' }: { activeUser?: string }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch('/api/plaid/transactions');
        if (res.ok) {
          const data = await res.json();
          setTransactions(data);
        }
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const filteredTransactions = transactions.filter(t => {
    // Filter by search term
    const matchesSearch = t.merchantName?.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase());

    // Filter by active user
    const matchesUser = activeUser === 'all' || t.plaidItem?.familyMemberId === activeUser;

    return matchesSearch && matchesUser;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="sticky top-0 z-10">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-slate-400 w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 bg-glass-200 border border-white/10 rounded-xl text-sm placeholder-slate-500 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all text-white"
            placeholder="Search transactions..."
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-t-2 border-brand-primary rounded-full animate-spin"></div>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p>No transactions found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((t, i) => (
            <FadeIn key={t.id} delay={i * 0.05}>
              <div className="flex items-center justify-between p-4 rounded-xl bg-glass-100 border border-white/5 hover:bg-glass-200 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-glass-200 flex items-center justify-center text-slate-300">
                    {/* TODO: Use category icon if available */}
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{t.merchantName || t.name}</p>
                    <p className="text-xs text-slate-500">
                      {t.category ? t.category[0] : 'Uncategorized'} • {formatDate(t.date)}
                    </p>
                    {t.plaidItem?.institutionName && (
                      <p className="text-[10px] text-slate-600">{t.plaidItem.institutionName}</p>
                    )}
                  </div>
                </div>
                <p className={`text-sm font-mono font-bold ${t.amount > 0 ? 'text-white' : 'text-green-400'}`}>
                  ${Math.abs(t.amount).toFixed(2)}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}
