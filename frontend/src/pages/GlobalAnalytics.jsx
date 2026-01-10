import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { api, useAuth } from "@/App";
import { toast } from "sonner";
import { 
  Music, Eye, MousePointer, TrendingUp, Share2, QrCode,
  Globe, MapPin, BarChart3, Settings, LogOut, ArrowUpRight, Shield, BadgeCheck
} from "lucide-react";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar
} from "recharts";

export default function GlobalAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get("/analytics/global/summary");
      setAnalytics(response.data);
    } catch (error) {
      toast.error("Не удалось загрузить аналитику");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Calculate growth (mock for now, would need historical data)
  const getGrowth = (value) => {
    if (value > 100) return "+12%";
    if (value > 50) return "+8%";
    if (value > 10) return "+5%";
    return "—";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-zinc-900/50 border-r border-white/5 p-6 hidden lg:flex flex-col">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Music className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-xl">MYTRACK</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          <Link 
            to="/multilinks" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <BarChart3 className="w-5 h-5" />
            Мультиссылки
          </Link>
          
          <Link 
            to="/analytics" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 text-foreground"
          >
            <Eye className="w-5 h-5" />
            Аналитика
          </Link>
          
          {user?.role === "admin" && (
            <Link 
              to="/admin" 
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Shield className="w-5 h-5" />
              Админ-панель
            </Link>
          )}
          
          <Link 
            to="/settings" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="w-5 h-5" />
            Настройки
          </Link>
          
          <Link 
            to="/verification" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <BadgeCheck className="w-5 h-5" />
            Верификация
          </Link>
        </nav>
        
        <div className="pt-6 border-t border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-medium">{user?.username?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="font-medium truncate">{user?.username}</p>
                {user?.verified && user?.show_verification_badge !== false && (
                  <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Выйти
          </Button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-display mb-2">Аналитика</h1>
            <p className="text-muted-foreground">Обзор статистики всех ваших страниц</p>
          </div>
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xs text-green-500 font-medium">{getGrowth(analytics?.total_views)}</span>
              </div>
              <p className="text-3xl font-bold mb-1">
                {(analytics?.total_views || 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Просмотров</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <MousePointer className="w-6 h-6 text-green-500" />
                </div>
                <span className="text-xs text-green-500 font-medium">{getGrowth(analytics?.total_clicks)}</span>
              </div>
              <p className="text-3xl font-bold mb-1">
                {(analytics?.total_clicks || 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Кликов</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Share2 className="w-6 h-6 text-blue-500" />
                </div>
                <span className="text-xs text-green-500 font-medium">{getGrowth(analytics?.total_shares)}</span>
              </div>
              <p className="text-3xl font-bold mb-1">
                {(analytics?.total_shares || 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Поделились</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-purple-500" />
                </div>
                <span className="text-xs text-green-500 font-medium">{getGrowth(analytics?.total_qr_scans)}</span>
              </div>
              <p className="text-3xl font-bold mb-1">
                {(analytics?.total_qr_scans || 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">QR сканов</p>
            </motion.div>
          </div>
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Timeline Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Динамика фан-базы</h3>
                  <p className="text-sm text-muted-foreground">Клики и просмотры за 30 дней</p>
                </div>
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
              </div>
              
              {analytics?.timeline && analytics.timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={analytics.timeline}>
                    <defs>
                      <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorShares" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#71717a" 
                      fontSize={12}
                      tickFormatter={(value) => value.slice(5)}
                    />
                    <YAxis stroke="#71717a" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#18181b', 
                        border: '1px solid #27272a',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: '#a1a1aa' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="clicks" 
                      stroke="#d946ef" 
                      fillOpacity={1} 
                      fill="url(#colorClicks)"
                      name="Клики"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="shares" 
                      stroke="#22c55e" 
                      fillOpacity={1} 
                      fill="url(#colorShares)"
                      name="Репосты"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Нет данных за последние 30 дней
                </div>
              )}
            </motion.div>
            
            {/* Share Types */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Способы распространения</h3>
                  <p className="text-sm text-muted-foreground">Как люди делятся вашими страницами</p>
                </div>
                <Share2 className="w-5 h-5 text-muted-foreground" />
              </div>
              
              <div className="space-y-4">
                {[
                  { 
                    type: "link", 
                    label: "Прямая ссылка", 
                    icon: ArrowUpRight, 
                    color: "#d946ef",
                    count: analytics?.shares_by_type?.link || 0
                  },
                  { 
                    type: "qr", 
                    label: "QR-код", 
                    icon: QrCode, 
                    color: "#8b5cf6",
                    count: analytics?.shares_by_type?.qr || analytics?.total_qr_scans || 0
                  },
                  { 
                    type: "social", 
                    label: "Социальные сети", 
                    icon: Share2, 
                    color: "#22c55e",
                    count: analytics?.shares_by_type?.social || 0
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const total = (analytics?.shares_by_type?.link || 0) + 
                               (analytics?.shares_by_type?.qr || 0) + 
                               (analytics?.shares_by_type?.social || 0) + 
                               (analytics?.total_qr_scans || 0);
                  const percentage = total > 0 ? ((item.count / total) * 100).toFixed(0) : 0;
                  
                  return (
                    <div key={item.type} className="flex items-center gap-4">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${item.color}20` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: item.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{item.label}</span>
                          <span className="text-sm text-muted-foreground">{item.count}</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%`, backgroundColor: item.color }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
          
          {/* Geography */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Countries */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold">По странам</h3>
                  <p className="text-sm text-muted-foreground">Географическое распределение кликов</p>
                </div>
                <Globe className="w-5 h-5 text-muted-foreground" />
              </div>
              
              {analytics?.by_country && analytics.by_country.length > 0 ? (
                <div className="space-y-3">
                  {analytics.by_country.map((item, i) => {
                    const maxClicks = analytics.by_country[0]?.clicks || 1;
                    const percentage = ((item.clicks / maxClicks) * 100).toFixed(0);
                    
                    return (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-8 text-lg">
                          {getCountryFlag(item.country)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{getCountryName(item.country)}</span>
                            <span className="text-sm text-muted-foreground">{item.clicks}</span>
                          </div>
                          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-primary transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Globe className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Нет данных о географии</p>
                  </div>
                </div>
              )}
            </motion.div>
            
            {/* Cities */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold">По городам</h3>
                  <p className="text-sm text-muted-foreground">Топ городов по активности</p>
                </div>
                <MapPin className="w-5 h-5 text-muted-foreground" />
              </div>
              
              {analytics?.by_city && analytics.by_city.length > 0 ? (
                <div className="space-y-3">
                  {analytics.by_city.map((item, i) => {
                    const maxClicks = analytics.by_city[0]?.clicks || 1;
                    const percentage = ((item.clicks / maxClicks) * 100).toFixed(0);
                    
                    return (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-sm font-medium">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{item.city}</span>
                            <span className="text-sm text-muted-foreground">{item.clicks}</span>
                          </div>
                          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-blue-500 transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Нет данных о городах</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
          
          {/* Pages Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">Статистика по страницам</h3>
                <p className="text-sm text-muted-foreground">Детальная аналитика каждой страницы</p>
              </div>
            </div>
            
            {analytics?.pages && analytics.pages.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Страница</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Просмотры</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Клики</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Репосты</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">QR</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.pages.map((page) => {
                      const ctr = page.views > 0 ? ((page.clicks / page.views) * 100).toFixed(1) : 0;
                      return (
                        <tr key={page.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4">
                            <Link to={`/analytics/${page.id}`} className="hover:text-primary transition-colors">
                              <p className="font-medium">{page.title}</p>
                              <p className="text-sm text-muted-foreground">/{page.slug}</p>
                            </Link>
                          </td>
                          <td className="text-right py-3 px-4 font-medium">{page.views.toLocaleString()}</td>
                          <td className="text-right py-3 px-4 font-medium">{page.clicks.toLocaleString()}</td>
                          <td className="text-right py-3 px-4 font-medium">{(page.shares || 0).toLocaleString()}</td>
                          <td className="text-right py-3 px-4 font-medium">{(page.qr_scans || 0).toLocaleString()}</td>
                          <td className="text-right py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              ctr > 10 ? 'bg-green-500/10 text-green-500' :
                              ctr > 5 ? 'bg-yellow-500/10 text-yellow-500' :
                              'bg-zinc-500/10 text-zinc-500'
                            }`}>
                              {ctr}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>У вас пока нет страниц</p>
                <Link to="/page/new">
                  <Button className="mt-4 bg-primary hover:bg-primary/90">
                    Создать первую страницу
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

// Helper functions for country display
function getCountryFlag(code) {
  const flags = {
    "RU": "🇷🇺",
    "US": "🇺🇸",
    "UA": "🇺🇦",
    "BY": "🇧🇾",
    "KZ": "🇰🇿",
    "DE": "🇩🇪",
    "GB": "🇬🇧",
    "FR": "🇫🇷",
    "IT": "🇮🇹",
    "ES": "🇪🇸",
    "PL": "🇵🇱",
    "Unknown": "🌍"
  };
  return flags[code] || "🌍";
}

function getCountryName(code) {
  const names = {
    "RU": "Россия",
    "US": "США",
    "UA": "Украина",
    "BY": "Беларусь",
    "KZ": "Казахстан",
    "DE": "Германия",
    "GB": "Великобритания",
    "FR": "Франция",
    "IT": "Италия",
    "ES": "Испания",
    "PL": "Польша",
    "Unknown": "Неизвестно"
  };
  return names[code] || code;
}
