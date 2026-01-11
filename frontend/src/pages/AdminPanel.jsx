import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { api, useAuth } from "@/App";
import { toast } from "sonner";
import { 
  Users, FileText, Shield, Ban, Check, Eye, ExternalLink,
  Globe, MapPin, MousePointer, Share2, QrCode, Cpu, 
  HardDrive, Activity, TrendingUp, Server, Music,
  BadgeCheck, X, Award
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import Sidebar from "@/components/Sidebar";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [pages, setPages] = useState([]);
  const [verificationRequests, setVerificationRequests] = useState([]);
  const [globalAnalytics, setGlobalAnalytics] = useState(null);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  useAuth();

  useEffect(() => {
    fetchData();
    fetchGlobalAnalytics();
    fetchSystemMetrics();
    fetchVerificationRequests();
    
    // Refresh system metrics every 30 seconds
    const metricsInterval = setInterval(fetchSystemMetrics, 30000);
    return () => clearInterval(metricsInterval);
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, pagesRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/pages")
      ]);
      setUsers(usersRes.data);
      setPages(pagesRes.data);
    } catch (error) {
      toast.error("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalAnalytics = async () => {
    try {
      const response = await api.get("/admin/analytics/global");
      setGlobalAnalytics(response.data);
    } catch (error) {
      console.error("Failed to fetch global analytics");
    }
  };

  const fetchSystemMetrics = async () => {
    try {
      const response = await api.get("/admin/system/metrics");
      setSystemMetrics(response.data);
    } catch (error) {
      console.error("Failed to fetch system metrics");
    }
  };

  const fetchVerificationRequests = async () => {
    try {
      const response = await api.get("/admin/verification/requests");
      setVerificationRequests(response.data);
    } catch (error) {
      console.error("Failed to fetch verification requests");
    }
  };

  const toggleUserBlock = async (userId) => {
    try {
      const response = await api.put(`/admin/users/${userId}/block`);
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error("Не удалось обновить пользователя");
    }
  };

  const approveVerification = async (userId) => {
    try {
      await api.put(`/admin/verification/${userId}/approve`);
      toast.success("Верификация одобрена");
      fetchVerificationRequests();
      fetchData();
    } catch (error) {
      toast.error("Не удалось одобрить верификацию");
    }
  };

  const rejectVerification = async (userId) => {
    try {
      await api.put(`/admin/verification/${userId}/reject`);
      toast.success("Верификация отклонена");
      fetchVerificationRequests();
      fetchData();
    } catch (error) {
      toast.error("Не удалось отклонить верификацию");
    }
  };

  const grantVerification = async (userId) => {
    try {
      await api.put(`/admin/verification/${userId}/grant`);
      toast.success("Верификация выдана");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Не удалось выдать верификацию");
    }
  };

  const revokeVerification = async (userId) => {
    try {
      await api.put(`/admin/verification/${userId}/revoke`);
      toast.success("Верификация отозвана");
      fetchData();
    } catch (error) {
      toast.error("Не удалось отозвать верификацию");
    }
  };

  const togglePageStatus = async (pageId) => {
    try {
      const response = await api.put(`/admin/pages/${pageId}/disable`);
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error("Не удалось обновить страницу");
    }
  };

  // Helper functions - Маппинг русских названий стран к флагам
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
    "Турция": "🇹🇷",
    "Швеция": "🇸🇪",
    "Норвегия": "🇳🇴",
    "Финляндия": "🇫🇮",
    "Дания": "🇩🇰",
    "Швейцария": "🇨🇭",
    "Австрия": "🇦🇹",
    "Израиль": "🇮🇱",
    "ОАЭ": "🇦🇪",
    "Сингапур": "🇸🇬",
    "Гонконг": "🇭🇰",
    "Таиланд": "🇹🇭",
    "Латвия": "🇱🇻",
    "Литва": "🇱🇹",
    "Эстония": "🇪🇪",
    "Грузия": "🇬🇪",
    "Армения": "🇦🇲",
    "Азербайджан": "🇦🇿",
    "Узбекистан": "🇺🇿",
    "Молдова": "🇲🇩",
    "Сербия": "🇷🇸",
    // Английские названия (fallback)
    "Russia": "🇷🇺",
    "United States": "🇺🇸",
    "Germany": "🇩🇪",
    "Hong Kong": "🇭🇰",
    // Коды стран
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

  const getCountryFlag = (country) => {
    return COUNTRY_FLAGS[country] || "🌍";
  };

  const getCountryName = (country) => {
    if (country && country !== "Unknown" && country !== "Неизвестно") {
      return country;
    }
    return "Неизвестно";
  };

  const getProgressColor = (percent) => {
    if (percent >= 90) return "bg-red-500";
    if (percent >= 70) return "bg-yellow-500";
    return "bg-green-500";
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
      <div className="p-4 sm:p-6 lg:p-10">
        {/* Header */}
        <div className="mb-6 sm:mb-10">
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">Админ-панель</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Управление пользователями, страницами и мониторинг</p>
        </div>
        
        {/* Tabs */}
        <Tabs defaultValue="analytics" className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-4 sm:mb-6">
            <TabsList className="bg-zinc-900 border border-white/5 inline-flex min-w-max">
              <TabsTrigger value="analytics" data-testid="tab-analytics" className="text-xs sm:text-sm">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Глобальная </span>Аналитика
              </TabsTrigger>
              <TabsTrigger value="system" data-testid="tab-system" className="text-xs sm:text-sm">
                <Server className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Мониторинг </span>VPS
              </TabsTrigger>
              <TabsTrigger value="verification" data-testid="tab-verification" className="text-xs sm:text-sm">
                <BadgeCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Верификация
                {verificationRequests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-[10px] sm:text-xs">
                    {verificationRequests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="users" data-testid="tab-users" className="text-xs sm:text-sm">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Пользователи
              </TabsTrigger>
              <TabsTrigger value="pages" data-testid="tab-pages" className="text-xs sm:text-sm">
                <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Страницы
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Global Analytics Tab */}
          <TabsContent value="analytics">
            {globalAnalytics ? (
              <div className="space-y-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-zinc-900/50 border border-white/5"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-muted-foreground">Пользователей</span>
                    </div>
                    <p className="text-2xl font-bold">{globalAnalytics.total_users}</p>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="p-4 rounded-xl bg-zinc-900/50 border border-white/5"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-purple-500" />
                      <span className="text-xs text-muted-foreground">Страниц</span>
                    </div>
                    <p className="text-2xl font-bold">{globalAnalytics.total_pages}</p>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-xl bg-zinc-900/50 border border-white/5"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Просмотров</span>
                    </div>
                    <p className="text-2xl font-bold">{globalAnalytics.total_views.toLocaleString()}</p>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="p-4 rounded-xl bg-zinc-900/50 border border-white/5"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <MousePointer className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-muted-foreground">Кликов</span>
                    </div>
                    <p className="text-2xl font-bold">{globalAnalytics.total_clicks.toLocaleString()}</p>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-4 rounded-xl bg-zinc-900/50 border border-white/5"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Share2 className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-muted-foreground">Репостов</span>
                    </div>
                    <p className="text-2xl font-bold">{globalAnalytics.total_shares.toLocaleString()}</p>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="p-4 rounded-xl bg-zinc-900/50 border border-white/5"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <QrCode className="w-4 h-4 text-violet-500" />
                      <span className="text-xs text-muted-foreground">QR сканов</span>
                    </div>
                    <p className="text-2xl font-bold">{globalAnalytics.total_qr_scans.toLocaleString()}</p>
                  </motion.div>
                </div>
                
                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Timeline */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
                  >
                    <h3 className="text-lg font-semibold mb-4">Динамика за 30 дней</h3>
                    {globalAnalytics.timeline && globalAnalytics.timeline.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={globalAnalytics.timeline}>
                          <defs>
                            <linearGradient id="adminColorClicks" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                          <YAxis stroke="#71717a" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} />
                          <Area type="monotone" dataKey="clicks" stroke="#d946ef" fillOpacity={1} fill="url(#adminColorClicks)" name="Клики" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                        Нет данных
                      </div>
                    )}
                  </motion.div>
                  
                  {/* Geography */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Globe className="w-5 h-5 text-muted-foreground" />
                      <h3 className="text-lg font-semibold">По странам</h3>
                    </div>
                    {globalAnalytics.by_country && globalAnalytics.by_country.length > 0 ? (
                      <div className="space-y-3">
                        {globalAnalytics.by_country.slice(0, 5).map((item, i) => {
                          const maxClicks = globalAnalytics.by_country[0]?.clicks || 1;
                          const percentage = ((item.clicks / maxClicks) * 100).toFixed(0);
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-lg">{getCountryFlag(item.country)}</span>
                              <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1">
                                  <span>{getCountryName(item.country)}</span>
                                  <span className="text-muted-foreground">{item.clicks}</span>
                                </div>
                                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${percentage}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-[150px] flex items-center justify-center text-muted-foreground">
                        <Globe className="w-8 h-8 opacity-50" />
                      </div>
                    )}
                  </motion.div>
                </div>
                
                {/* Top Pages */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
                >
                  <h3 className="text-lg font-semibold mb-4">Топ страниц по просмотрам</h3>
                  {globalAnalytics.top_pages && globalAnalytics.top_pages.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Страница</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Автор</th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Просмотры</th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Клики</th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Репосты</th>
                          </tr>
                        </thead>
                        <tbody>
                          {globalAnalytics.top_pages.map((page, i) => (
                            <tr key={page.id} className="border-b border-white/5">
                              <td className="py-2 px-3">
                                <a href={`/${page.slug}`} target="_blank" rel="noopener" className="hover:text-primary">
                                  {page.title}
                                </a>
                              </td>
                              <td className="py-2 px-3 text-muted-foreground">{page.username}</td>
                              <td className="text-right py-2 px-3 font-medium">{page.views.toLocaleString()}</td>
                              <td className="text-right py-2 px-3">{page.clicks.toLocaleString()}</td>
                              <td className="text-right py-2 px-3">{page.shares}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Нет данных</p>
                  )}
                </motion.div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
              </div>
            )}
          </TabsContent>
          
          {/* System Monitoring Tab */}
          <TabsContent value="system">
            {systemMetrics ? (
              <div className="space-y-6">
                {/* Resource Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* CPU */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <Cpu className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">CPU</p>
                          <p className="text-2xl font-bold">{systemMetrics.cpu.percent}%</p>
                        </div>
                      </div>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
                      <div 
                        className={`h-full rounded-full transition-all ${getProgressColor(systemMetrics.cpu.percent)}`}
                        style={{ width: `${systemMetrics.cpu.percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{systemMetrics.cpu.count} ядер</span>
                      <span>Load: {systemMetrics.cpu.load_1m}</span>
                    </div>
                  </motion.div>
                  
                  {/* Memory */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                          <Activity className="w-6 h-6 text-purple-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">RAM</p>
                          <p className="text-2xl font-bold">{systemMetrics.memory.percent}%</p>
                        </div>
                      </div>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
                      <div 
                        className={`h-full rounded-full transition-all ${getProgressColor(systemMetrics.memory.percent)}`}
                        style={{ width: `${systemMetrics.memory.percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{systemMetrics.memory.used_gb} GB</span>
                      <span>из {systemMetrics.memory.total_gb} GB</span>
                    </div>
                  </motion.div>
                  
                  {/* Disk */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                          <HardDrive className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Диск</p>
                          <p className="text-2xl font-bold">{systemMetrics.disk.percent}%</p>
                        </div>
                      </div>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
                      <div 
                        className={`h-full rounded-full transition-all ${getProgressColor(systemMetrics.disk.percent)}`}
                        style={{ width: `${systemMetrics.disk.percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{systemMetrics.disk.used_gb} GB</span>
                      <span>из {systemMetrics.disk.total_gb} GB</span>
                    </div>
                  </motion.div>
                  
                  {/* Network & Uptime */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                          <Server className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Аптайм</p>
                          <p className="text-xl font-bold">{systemMetrics.uptime}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-zinc-800 rounded-lg">
                        <p className="text-muted-foreground">↑ Отправлено</p>
                        <p className="font-medium">{systemMetrics.network.sent_mb} MB</p>
                      </div>
                      <div className="p-2 bg-zinc-800 rounded-lg">
                        <p className="text-muted-foreground">↓ Получено</p>
                        <p className="font-medium">{systemMetrics.network.recv_mb} MB</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
                
                {/* Load Average Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
                >
                  <h3 className="text-lg font-semibold mb-4">Средняя нагрузка системы</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-zinc-800 rounded-xl">
                      <p className="text-3xl font-bold text-blue-400">{systemMetrics.cpu.load_1m}</p>
                      <p className="text-xs text-muted-foreground mt-1">1 минута</p>
                    </div>
                    <div className="text-center p-4 bg-zinc-800 rounded-xl">
                      <p className="text-3xl font-bold text-purple-400">{systemMetrics.cpu.load_5m}</p>
                      <p className="text-xs text-muted-foreground mt-1">5 минут</p>
                    </div>
                    <div className="text-center p-4 bg-zinc-800 rounded-xl">
                      <p className="text-3xl font-bold text-green-400">{systemMetrics.cpu.load_15m}</p>
                      <p className="text-xs text-muted-foreground mt-1">15 минут</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    Последнее обновление: {new Date(systemMetrics.timestamp).toLocaleString('ru-RU')}
                  </p>
                </motion.div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
              </div>
            )}
          </TabsContent>
          
          {/* Verification Tab */}
          <TabsContent value="verification">
            <div className="space-y-6">
              {/* Pending Requests */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-primary" />
                  Заявки на верификацию
                </h3>
                
                {verificationRequests.filter(r => r.status === 'pending').length > 0 ? (
                  <div className="space-y-3">
                    {verificationRequests.filter(r => r.status === 'pending').map((req, i) => (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-4 rounded-xl bg-zinc-900/50 border border-white/5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="font-semibold">{req.artist_name}</span>
                              <span className="text-sm text-muted-foreground">(@{req.username})</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 truncate">{req.email}</p>
                            <div className="text-sm mb-2">
                              <span className="text-muted-foreground">Соц. сети: </span>
                              <span className="text-zinc-300 break-all">{req.social_links}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Описание: </span>
                              <span className="text-zinc-300">{req.description}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Подана: {new Date(req.created_at).toLocaleString('ru-RU')}
                            </p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              onClick={() => approveVerification(req.user_id)}
                              className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                            >
                              <Check className="w-4 h-4 sm:mr-1" />
                              <span className="hidden sm:inline">Одобрить</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectVerification(req.user_id)}
                              className="flex-1 sm:flex-none"
                            >
                              <X className="w-4 h-4 sm:mr-1" />
                              <span className="hidden sm:inline">Отклонить</span>
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8 bg-zinc-900/30 rounded-xl">
                    Нет ожидающих заявок
                  </p>
                )}
              </div>
              
              {/* Verified Users - Grant/Revoke */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  Управление верификацией пользователей
                </h3>
                
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="p-3 rounded-lg bg-zinc-900/30 border border-white/5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-medium">{user.username?.[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{user.username}</span>
                            {user.verified && (
                              <BadgeCheck className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </div>
                      
                      {user.role !== "admin" && (
                        user.verified ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => revokeVerification(user.id)}
                          >
                            Отозвать
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => grantVerification(user.id)}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <BadgeCheck className="w-4 h-4 mr-1" />
                            Выдать
                          </Button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* History */}
              {verificationRequests.filter(r => r.status !== 'pending').length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">История заявок</h3>
                  <div className="space-y-2">
                    {verificationRequests.filter(r => r.status !== 'pending').slice(0, 10).map((req) => (
                      <div
                        key={req.id}
                        className="p-3 rounded-lg bg-zinc-900/30 border border-white/5 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-medium">{req.artist_name}</span>
                          <span className="text-sm text-muted-foreground ml-2">(@{req.username})</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          req.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {req.status === 'approved' ? 'Одобрено' : 'Отклонено'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Users Tab */}
          <TabsContent value="users">
            <div className="space-y-3">
              {users.map((user, i) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 flex items-center justify-between"
                  data-testid={`user-row-${user.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-primary font-semibold">
                        {user.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.username}</p>
                        {user.role === "admin" && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary">
                            Админ
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          user.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {user.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{user.page_count} страниц</p>
                      <p className="text-xs text-muted-foreground">план {user.plan}</p>
                    </div>
                    
                    {user.role !== "admin" && (
                      <Button
                        variant={user.status === "active" ? "destructive" : "default"}
                        size="sm"
                        onClick={() => toggleUserBlock(user.id)}
                        data-testid={`block-user-${user.id}`}
                      >
                        {user.status === "active" ? (
                          <>
                            <Ban className="w-4 h-4 mr-1" />
                            Заблокировать
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Разблокировать
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {users.length === 0 && (
                <p className="text-center text-muted-foreground py-10">Пользователи не найдены</p>
              )}
            </div>
          </TabsContent>
          
          {/* Pages Tab */}
          <TabsContent value="pages">
            <div className="space-y-3">
              {pages.map((page, i) => (
                <motion.div
                  key={page.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 flex items-center justify-between"
                  data-testid={`page-row-${page.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden">
                      {page.cover_image ? (
                        <img 
                          src={page.cover_image.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${page.cover_image}` : page.cover_image}
                          alt={page.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{page.title}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          page.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {page.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        by {page.user?.username || "Unknown"} • /{page.slug}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Eye className="w-4 h-4" /> {page.views || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">{page.total_clicks || 0} кликов</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                      
                      <Button
                        variant={page.status === "active" ? "destructive" : "default"}
                        size="sm"
                        onClick={() => togglePageStatus(page.id)}
                        data-testid={`toggle-page-${page.id}`}
                      >
                        {page.status === "active" ? "Отключить" : "Включить"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {pages.length === 0 && (
                <p className="text-center text-muted-foreground py-10">Страницы не найдены</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Sidebar>
  );
}
