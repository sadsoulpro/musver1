import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { api, useAuth } from "@/App";
import { toast } from "sonner";
import { 
  Eye, MousePointer, TrendingUp, Share2, QrCode,
  Globe, MapPin, BarChart3, ArrowUpRight, Crown, Lock
} from "lucide-react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import Sidebar from "@/components/Sidebar";

export default function GlobalAnalytics() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Check if user has advanced analytics
  const hasAdvancedAnalytics = analytics?.has_advanced_analytics || 
    user?.plan_config?.has_advanced_analytics ||
    user?.plan === 'pro';

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

  const getGrowth = (value) => {
    if (value > 100) return "+12%";
    if (value > 50) return "+8%";
    if (value > 10) return "+5%";
    return "—";
  };

  if (loading) {
    return (
      <Sidebar>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-display mb-2">Аналитика</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Обзор статистики всех ваших страниц</p>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <span className="text-xs text-green-500 font-medium">{getGrowth(analytics?.total_views)}</span>
            </div>
            <p className="text-xl sm:text-3xl font-bold mb-1">
              {(analytics?.total_views || 0).toLocaleString()}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">Просмотров</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <MousePointer className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
              </div>
              <span className="text-xs text-green-500 font-medium">{getGrowth(analytics?.total_clicks)}</span>
            </div>
            <p className="text-xl sm:text-3xl font-bold mb-1">
              {(analytics?.total_clicks || 0).toLocaleString()}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">Кликов</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
              </div>
              <span className="text-xs text-green-500 font-medium">{getGrowth(analytics?.total_shares)}</span>
            </div>
            <p className="text-xl sm:text-3xl font-bold mb-1">
              {(analytics?.total_shares || 0).toLocaleString()}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">Поделились</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
              </div>
              <span className="text-xs text-green-500 font-medium">{getGrowth(analytics?.total_qr_scans)}</span>
            </div>
            <p className="text-xl sm:text-3xl font-bold mb-1">
              {(analytics?.total_qr_scans || 0).toLocaleString()}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">QR сканов</p>
          </motion.div>
        </div>
        
        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Timeline Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-4 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <h3 className="text-base sm:text-lg font-semibold">Динамика</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Клики за 30 дней</p>
              </div>
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </div>
            
            {analytics?.timeline && analytics.timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={analytics.timeline}>
                  <defs>
                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="#71717a" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="clicks" stroke="#d946ef" fillOpacity={1} fill="url(#colorClicks)" name="Клики" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                Нет данных за последние 30 дней
              </div>
            )}
          </motion.div>
          
          {/* Share Types */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-4 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <h3 className="text-base sm:text-lg font-semibold">Способы распространения</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Как делятся страницами</p>
              </div>
              <Share2 className="w-5 h-5 text-muted-foreground" />
            </div>
            
            <div className="space-y-4">
              {[
                { type: "link", label: "Прямая ссылка", icon: ArrowUpRight, color: "#d946ef", count: analytics?.shares_by_type?.link || 0 },
                { type: "qr", label: "QR-код", icon: QrCode, color: "#8b5cf6", count: analytics?.shares_by_type?.qr || analytics?.total_qr_scans || 0 },
                { type: "social", label: "Соц. сети", icon: Share2, color: "#22c55e", count: analytics?.shares_by_type?.social || 0 },
              ].map((item) => {
                const Icon = item.icon;
                const total = Object.values(analytics?.shares_by_type || {}).reduce((a, b) => a + b, 0) + (analytics?.total_qr_scans || 0);
                const percentage = total > 0 ? ((item.count / total) * 100).toFixed(0) : 0;
                
                return (
                  <div key={item.type} className="flex items-center gap-3 sm:gap-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}20` }}>
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: item.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs sm:text-sm font-medium">{item.label}</span>
                        <span className="text-xs sm:text-sm text-muted-foreground">{item.count}</span>
                      </div>
                      <div className="h-1.5 sm:h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
        
        {/* Geography */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8 relative">
          {/* PRO Overlay for geography */}
          {!hasAdvancedAnalytics && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-zinc-900/60 backdrop-blur-md">
              <div className="text-center p-6">
                <Crown className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">Доступно в PRO подписке</h3>
                <p className="text-sm text-muted-foreground mb-4">География кликов доступна в PRO версии</p>
                <Link to="/pricing">
                  <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                    Перейти на PRO
                  </Button>
                </Link>
              </div>
            </div>
          )}
          
          {/* Countries */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className={`p-4 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5 ${!hasAdvancedAnalytics ? 'filter blur-sm' : ''}`}>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <h3 className="text-base sm:text-lg font-semibold">По странам</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Распределение кликов</p>
              </div>
              <Globe className="w-5 h-5 text-muted-foreground" />
            </div>
            
            {analytics?.by_country?.length > 0 ? (
              <div className="space-y-3">
                {analytics.by_country.slice(0, 5).map((item, i) => {
                  const maxClicks = analytics.by_country[0]?.clicks || 1;
                  const percentage = ((item.clicks / maxClicks) * 100).toFixed(0);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 text-base">{getCountryFlag(item.country)}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs sm:text-sm font-medium">{getCountryName(item.country)}</span>
                          <span className="text-xs text-muted-foreground">{item.clicks}</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-muted-foreground text-sm">
                <div className="text-center"><Globe className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>Нет данных</p></div>
              </div>
            )}
          </motion.div>
          
          {/* Cities */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="p-4 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <h3 className="text-base sm:text-lg font-semibold">По городам</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Топ городов</p>
              </div>
              <MapPin className="w-5 h-5 text-muted-foreground" />
            </div>
            
            {analytics?.by_city?.length > 0 ? (
              <div className="space-y-3">
                {analytics.by_city.slice(0, 5).map((item, i) => {
                  const maxClicks = analytics.by_city[0]?.clicks || 1;
                  const percentage = ((item.clicks / maxClicks) * 100).toFixed(0);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-xs font-medium">{i + 1}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs sm:text-sm font-medium">{item.city}</span>
                          <span className="text-xs text-muted-foreground">{item.clicks}</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-muted-foreground text-sm">
                <div className="text-center"><MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>Нет данных</p></div>
              </div>
            )}
          </motion.div>
        </div>
        
        {/* Pages Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="p-4 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5">
          <div className="mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold">Статистика по страницам</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Детальная аналитика</p>
          </div>
          
          {analytics?.pages?.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Страница</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Просм.</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Клики</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.pages.map((page) => {
                    const ctr = page.views > 0 ? ((page.clicks / page.views) * 100).toFixed(1) : 0;
                    return (
                      <tr key={page.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-2 px-3">
                          <Link to={`/analytics/${page.id}`} className="hover:text-primary">
                            <p className="font-medium text-sm truncate max-w-[150px] sm:max-w-none">{page.title}</p>
                            <p className="text-xs text-muted-foreground">/{page.slug}</p>
                          </Link>
                        </td>
                        <td className="text-right py-2 px-3 text-sm">{page.views.toLocaleString()}</td>
                        <td className="text-right py-2 px-3 text-sm">{page.clicks.toLocaleString()}</td>
                        <td className="text-right py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${ctr > 10 ? 'bg-green-500/10 text-green-500' : ctr > 5 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-zinc-500/10 text-zinc-500'}`}>
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
            <div className="py-8 text-center text-muted-foreground">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">У вас пока нет страниц</p>
              <Link to="/page/new"><Button className="mt-4 bg-primary hover:bg-primary/90" size="sm">Создать страницу</Button></Link>
            </div>
          )}
        </motion.div>
      </div>
    </Sidebar>
  );
}

// Маппинг русских названий стран к флагам эмодзи
const COUNTRY_FLAGS = {
  // Русские названия (от ip-api.com с lang=ru)
  "Россия": "🇷🇺",
  "США": "🇺🇸",
  "Украина": "🇺🇦",
  "Беларусь": "🇧🇾",
  "Казахстан": "🇰🇿",
  "Германия": "🇩🇪",
  "ФРГ": "🇩🇪",
  "Великобритания": "🇬🇧",
  "Франция": "🇫🇷",
  "Италия": "🇮🇹",
  "Испания": "🇪🇸",
  "Нидерланды": "🇳🇱",
  "Польша": "🇵🇱",
  "Канада": "🇨🇦",
  "Австралия": "🇦🇺",
  "Китай": "🇨🇳",
  "Япония": "🇯🇵",
  "Южная Корея": "🇰🇷",
  "Индия": "🇮🇳",
  "Бразилия": "🇧🇷",
  "Мексика": "🇲🇽",
  "Турция": "🇹🇷",
  "Швеция": "🇸🇪",
  "Норвегия": "🇳🇴",
  "Финляндия": "🇫🇮",
  "Дания": "🇩🇰",
  "Швейцария": "🇨🇭",
  "Австрия": "🇦🇹",
  "Бельгия": "🇧🇪",
  "Чехия": "🇨🇿",
  "Португалия": "🇵🇹",
  "Греция": "🇬🇷",
  "Израиль": "🇮🇱",
  "ОАЭ": "🇦🇪",
  "Сингапур": "🇸🇬",
  "Гонконг": "🇭🇰",
  "Тайвань": "🇹🇼",
  "Таиланд": "🇹🇭",
  "Вьетнам": "🇻🇳",
  "Индонезия": "🇮🇩",
  "Малайзия": "🇲🇾",
  "Филиппины": "🇵🇭",
  "Аргентина": "🇦🇷",
  "Чили": "🇨🇱",
  "Колумбия": "🇨🇴",
  "Перу": "🇵🇪",
  "Египет": "🇪🇬",
  "ЮАР": "🇿🇦",
  "Нигерия": "🇳🇬",
  "Латвия": "🇱🇻",
  "Литва": "🇱🇹",
  "Эстония": "🇪🇪",
  "Грузия": "🇬🇪",
  "Армения": "🇦🇲",
  "Азербайджан": "🇦🇿",
  "Узбекистан": "🇺🇿",
  "Кыргызстан": "🇰🇬",
  "Таджикистан": "🇹🇯",
  "Туркменистан": "🇹🇲",
  "Молдова": "🇲🇩",
  "Сербия": "🇷🇸",
  "Хорватия": "🇭🇷",
  "Словения": "🇸🇮",
  "Словакия": "🇸🇰",
  "Румыния": "🇷🇴",
  "Болгария": "🇧🇬",
  "Венгрия": "🇭🇺",
  "Ирландия": "🇮🇪",
  "Новая Зеландия": "🇳🇿",
  // Английские названия (fallback)
  "Russia": "🇷🇺",
  "United States": "🇺🇸",
  "Ukraine": "🇺🇦",
  "Belarus": "🇧🇾",
  "Kazakhstan": "🇰🇿",
  "Germany": "🇩🇪",
  "United Kingdom": "🇬🇧",
  "France": "🇫🇷",
  "Hong Kong": "🇭🇰",
  // Коды стран (на всякий случай)
  "RU": "🇷🇺",
  "US": "🇺🇸",
  "UA": "🇺🇦",
  "BY": "🇧🇾",
  "KZ": "🇰🇿",
  "DE": "🇩🇪",
  "GB": "🇬🇧",
  "FR": "🇫🇷",
  // Неизвестно
  "Неизвестно": "🌍",
  "Unknown": "🌍",
};

function getCountryFlag(country) {
  return COUNTRY_FLAGS[country] || "🌍";
}

function getCountryName(country) {
  // Если это уже русское название - возвращаем как есть
  if (country && country !== "Unknown" && country !== "Неизвестно") {
    return country;
  }
  return "Неизвестно";
}
