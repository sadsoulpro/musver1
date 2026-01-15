import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { api, useAuth } from "@/App";
import { toast } from "sonner";
import { 
  Users, FileText, Shield, Ban, Check, Eye, ExternalLink,
  Globe, MapPin, MousePointer, Share2, QrCode, Cpu, 
  HardDrive, Activity, TrendingUp, Server, Music,
  BadgeCheck, X, Crown, ChevronDown, UserCog, Sliders, 
  Save, BarChart3, PieChart, Calendar, Clock, Zap, Link2, Trash2, Search,
  MessageCircle, AlertCircle, CheckCircle, Send, User
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart as RechartsPie, Pie, Cell, BarChart, Bar
} from "recharts";
import Sidebar from "@/components/Sidebar";
import { useLanguage } from "@/contexts/LanguageContext";

// Role configuration - labels are translation keys
const ROLE_CONFIG = {
  owner: { labelKey: "roleOwner", color: "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 border-yellow-500/30", icon: Crown },
  admin: { labelKey: "roleAdmin", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: Shield },
  moderator: { labelKey: "roleModerator", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: UserCog },
  user: { labelKey: "roleUser", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30", icon: Users }
};

const PLAN_CONFIG = {
  free: { label: "Free", color: "bg-zinc-700/50 text-zinc-300" },
  pro: { label: "Pro", color: "bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-300" }
};

const TICKET_STATUS_CONFIG = {
  open: { label: "Открыт", color: "bg-blue-500", icon: AlertCircle },
  in_progress: { label: "В работе", color: "bg-yellow-500", icon: Clock },
  resolved: { label: "Решён", color: "bg-green-500", icon: CheckCircle },
  closed: { label: "Закрыт", color: "bg-zinc-500", icon: CheckCircle }
};

const COLORS = ['#d946ef', '#8b5cf6', '#3b82f6', '#22c55e', '#eab308', '#ef4444'];

export default function AdminPanel() {
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [pages, setPages] = useState([]);
  const [verificationRequests, setVerificationRequests] = useState([]);
  const [globalAnalytics, setGlobalAnalytics] = useState(null);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [planConfigs, setPlanConfigs] = useState([]);
  const [subdomains, setSubdomains] = useState([]);
  const [subdomainsTotal, setSubdomainsTotal] = useState(0);
  const [subdomainSearch, setSubdomainSearch] = useState("");
  const [tickets, setTickets] = useState([]);
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [unreadTickets, setUnreadTickets] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketReply, setTicketReply] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState(null);
  const [activeTab, setActiveTab] = useState("analytics");

  const isOwner = currentUser?.role === "owner";
  const isAdmin = currentUser?.role === "admin" || isOwner;
  const canViewVPS = isOwner || isAdmin;

  // Helper to extract error message from API response
  const getErrorMessage = (error, defaultMsg) => {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map(d => d.msg || String(d)).join(', ');
    if (detail && typeof detail === 'object' && detail.msg) return detail.msg;
    return defaultMsg || t('errors', 'generic');
  };

  useEffect(() => {
    fetchData();
    fetchGlobalAnalytics();
    if (canViewVPS) fetchSystemMetrics();
    fetchVerificationRequests();
    fetchPlanConfigs();
    fetchSubdomains();
    fetchTickets();
    
    const metricsInterval = setInterval(() => {
      if (canViewVPS) fetchSystemMetrics();
      fetchUnreadTicketsCount();
    }, 30000);
    return () => clearInterval(metricsInterval);
  }, [canViewVPS]);

  const fetchData = async () => {
    try {
      const [usersRes, pagesRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/pages")
      ]);
      setUsers(usersRes.data);
      setPages(pagesRes.data);
    } catch (error) {
      toast.error(t('errors', 'loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
      const params = ticketStatusFilter ? `?status=${ticketStatusFilter}` : '';
      const response = await api.get(`/admin/tickets${params}`);
      setTickets(response.data.tickets || []);
      setTicketsTotal(response.data.total || 0);
      fetchUnreadTicketsCount();
    } catch (error) {
      console.error("Failed to fetch tickets");
    }
  };

  const fetchUnreadTicketsCount = async () => {
    try {
      const response = await api.get("/admin/tickets/unread-count");
      setUnreadTickets(response.data.unread_count);
    } catch (error) {
      console.error("Failed to fetch unread count");
    }
  };

  const openTicket = async (ticketId) => {
    try {
      const response = await api.get(`/admin/tickets/${ticketId}`);
      setSelectedTicket(response.data);
      // Update local list
      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, is_read_by_staff: true } : t
      ));
      fetchUnreadTicketsCount();
    } catch (error) {
      toast.error("Не удалось загрузить тикет");
    }
  };

  const sendTicketReply = async () => {
    if (!ticketReply.trim() || !selectedTicket) return;
    
    try {
      const response = await api.post(`/tickets/${selectedTicket.id}/reply`, {
        message: ticketReply
      });
      setSelectedTicket(response.data);
      setTicketReply("");
      setTickets(prev => prev.map(t => 
        t.id === selectedTicket.id ? response.data : t
      ));
      toast.success("Ответ отправлен");
    } catch (error) {
      toast.error("Не удалось отправить ответ");
    }
  };

  const updateTicketStatus = async (ticketId, status) => {
    try {
      await api.put(`/admin/tickets/${ticketId}/status`, { status });
      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, status } : t
      ));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => ({ ...prev, status }));
      }
      toast.success("Статус обновлён");
    } catch (error) {
      toast.error("Не удалось обновить статус");
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

  const fetchPlanConfigs = async () => {
    try {
      const response = await api.get("/admin/plan-configs");
      setPlanConfigs(response.data);
    } catch (error) {
      console.error("Failed to fetch plan configs");
    }
  };

  const fetchSubdomains = async (search = "") => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const response = await api.get(`/admin/subdomains${params}`);
      setSubdomains(response.data.subdomains || []);
      setSubdomainsTotal(response.data.total || 0);
    } catch (error) {
      console.error("Failed to fetch subdomains");
    }
  };

  const toggleSubdomainAdmin = async (subdomainId, currentDisabled) => {
    try {
      // Backend expects is_active: if currently disabled, we want to enable (is_active: true)
      await api.put(`/admin/subdomains/${subdomainId}/toggle`, { is_active: currentDisabled });
      toast.success(currentDisabled ? "Поддомен разблокирован" : "Поддомен заблокирован");
      fetchSubdomains(subdomainSearch);
    } catch (error) {
      toast.error("Ошибка");
    }
  };

  const deleteSubdomainAdmin = async (subdomainId) => {
    if (!confirm("Удалить поддомен? Это действие необратимо.")) return;
    try {
      await api.delete(`/admin/subdomains/${subdomainId}`);
      toast.success("Поддомен удалён");
      fetchSubdomains(subdomainSearch);
    } catch (error) {
      toast.error("Ошибка");
    }
  };

  // User Management
  const toggleUserBan = async (userId, currentBanned) => {
    try {
      await api.put(`/admin/users/${userId}/ban`, { is_banned: !currentBanned });
      toast.success(currentBanned ? "Пользователь разбанен" : "Пользователь забанен");
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      toast.success(`Роль изменена`);
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const updateUserPlan = async (userId, newPlan) => {
    try {
      await api.put(`/admin/users/${userId}/plan`, { plan: newPlan });
      toast.success(`План изменён`);
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const updateOwnerPlan = async (newPlan) => {
    try {
      await api.put(`/owner/my-plan`, { plan: newPlan });
      toast.success(`Ваш план изменён на ${newPlan} для тестирования`);
      window.location.reload(); // Reload to update user context
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const toggleUserVerify = async (userId, currentVerified) => {
    try {
      await api.put(`/admin/users/${userId}/verify`, { is_verified: !currentVerified });
      toast.success(currentVerified ? "Верификация снята" : "Верифицирован");
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const updatePlanConfig = async (planName, updates) => {
    try {
      await api.put(`/admin/plan-configs/${planName}`, updates);
      toast.success(t('common', 'success'));
      fetchPlanConfigs();
      setEditingPlan(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const approveVerification = async (userId) => {
    try {
      await api.put(`/admin/verification/${userId}/approve`);
      toast.success(t('admin', 'approved'));
      fetchVerificationRequests();
      fetchData();
    } catch (error) {
      toast.error(t('errors', 'generic'));
    }
  };

  const rejectVerification = async (userId) => {
    try {
      await api.put(`/admin/verification/${userId}/reject`);
      toast.success(t('admin', 'rejected'));
      fetchVerificationRequests();
      fetchData();
    } catch (error) {
      toast.error(t('errors', 'generic'));
    }
  };

  const togglePageStatus = async (pageId) => {
    try {
      await api.put(`/admin/pages/${pageId}/disable`);
      toast.success(t('common', 'success'));
      fetchData();
    } catch (error) {
      toast.error(t('errors', 'generic'));
    }
  };

  // Country flags
  const COUNTRY_FLAGS = {
    "Россия": "🇷🇺", "США": "🇺🇸", "Украина": "🇺🇦", "Беларусь": "🇧🇾",
    "Казахстан": "🇰🇿", "Германия": "🇩🇪", "ФРГ": "🇩🇪", "Великобритания": "🇬🇧",
    "Франция": "🇫🇷", "Гонконг": "🇭🇰", "Сингапур": "🇸🇬",
    "Неизвестно": "🌍", "Unknown": "🌍",
  };
  const getCountryFlag = (country) => COUNTRY_FLAGS[country] || "🌍";

  const getProgressColor = (percent) => {
    if (percent >= 90) return "bg-red-500";
    if (percent >= 70) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  // Prepare chart data
  const planDistribution = [
    { name: 'Free', value: users.filter(u => u.plan === 'free').length, color: '#71717a' },
    { name: 'Pro', value: users.filter(u => u.plan === 'pro').length, color: '#a855f7' }
  ].filter(p => p.value > 0);

  const roleDistribution = [
    { name: t('admin', 'users'), value: users.filter(u => u.role === 'user').length },
    { name: t('admin', 'moderators'), value: users.filter(u => u.role === 'moderator').length },
    { name: t('admin', 'admins'), value: users.filter(u => u.role === 'admin').length },
    { name: t('admin', 'owners'), value: users.filter(u => u.role === 'owner').length }
  ].filter(r => r.value > 0);

  if (loading) {
    return (
      <Sidebar>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
              <Zap className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-muted-foreground">{t('common', 'loading')}</p>
          </div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                      {t('admin', 'title')}
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {currentUser?.email}
                    </p>
                  </div>
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-sm border ${ROLE_CONFIG[currentUser?.role]?.color}`}>
                {ROLE_CONFIG[currentUser?.role]?.label}
              </div>
            </div>
            
            {/* Owner Test Plan Switcher */}
            {isOwner && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-300">{t('admin', 'testSubscriptions')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t('admin', 'yourPlan')}:</span>
                    <select
                      value={currentUser?.plan || 'free'}
                      onChange={(e) => updateOwnerPlan(e.target.value)}
                      className="h-8 px-3 rounded-lg bg-zinc-800 border border-yellow-500/30 text-sm cursor-pointer hover:border-yellow-500/50 transition-colors text-white"
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                    </select>
                    <span className="text-xs text-muted-foreground">({t('admin', 'forTesting')})</span>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
              <TabsList className="bg-zinc-900/80 backdrop-blur-sm border border-white/5 p-1 rounded-xl inline-flex min-w-max">
                <TabsTrigger value="analytics" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm px-3 sm:px-4">
                  <BarChart3 className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">{t('admin', 'globalAnalytics')}</span>
                  <span className="sm:hidden">{t('nav', 'analytics')}</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm px-3 sm:px-4">
                  <Users className="w-4 h-4 mr-1.5" />
                  {t('admin', 'users')}
                </TabsTrigger>
                <TabsTrigger value="plans" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm px-3 sm:px-4">
                  <Sliders className="w-4 h-4 mr-1.5" />
                  {t('admin', 'plans')}
                </TabsTrigger>
                <TabsTrigger value="pages" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm px-3 sm:px-4">
                  <FileText className="w-4 h-4 mr-1.5" />
                  {t('admin', 'pages')}
                </TabsTrigger>
                <TabsTrigger value="domains" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm px-3 sm:px-4">
                  <Link2 className="w-4 h-4 mr-1.5" />
                  {t('nav', 'domains')}
                  {subdomainsTotal > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px]">{subdomainsTotal}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="tickets" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm px-3 sm:px-4 relative">
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  {t('admin', 'tickets')}
                  {unreadTickets > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center animate-pulse">
                      {unreadTickets}
                    </span>
                  )}
                </TabsTrigger>
                {verificationRequests.filter(r => r.status === 'pending').length > 0 && (
                  <TabsTrigger value="verification" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm px-3 sm:px-4 relative">
                    <BadgeCheck className="w-4 h-4 mr-1.5" />
                    {t('admin', 'requests')}
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                      {verificationRequests.filter(r => r.status === 'pending').length}
                    </span>
                  </TabsTrigger>
                )}
                {canViewVPS && (
                  <TabsTrigger value="system" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm px-3 sm:px-4">
                    <Server className="w-4 h-4 mr-1.5" />
                    VPS
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            {/* Global Analytics Tab */}
            <TabsContent value="analytics" className="mt-0">
              <div className="space-y-6">
                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                  {[
                    { icon: Users, label: t('admin', 'totalUsers'), value: globalAnalytics?.total_users || users.length, color: "from-blue-500 to-cyan-500", bg: "bg-blue-500/10" },
                    { icon: FileText, label: t('admin', 'totalPages'), value: globalAnalytics?.total_pages || pages.length, color: "from-purple-500 to-pink-500", bg: "bg-purple-500/10" },
                    { icon: Eye, label: t('admin', 'totalViews'), value: globalAnalytics?.total_views || 0, color: "from-emerald-500 to-teal-500", bg: "bg-emerald-500/10" },
                    { icon: MousePointer, label: t('admin', 'totalClicks'), value: globalAnalytics?.total_clicks || 0, color: "from-orange-500 to-amber-500", bg: "bg-orange-500/10" },
                    { icon: Share2, label: t('admin', 'totalShares'), value: globalAnalytics?.total_shares || 0, color: "from-pink-500 to-rose-500", bg: "bg-pink-500/10" },
                    { icon: QrCode, label: t('admin', 'totalQrScans'), value: globalAnalytics?.total_qr_scans || 0, color: "from-violet-500 to-purple-500", bg: "bg-violet-500/10" }
                  ].map((stat, idx) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`relative overflow-hidden p-4 sm:p-5 rounded-2xl ${stat.bg} border border-white/5 group hover:border-white/10 transition-all`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                      <stat.icon className={`w-5 h-5 mb-3 bg-gradient-to-r ${stat.color} bg-clip-text`} style={{ color: 'transparent', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} />
                      <p className="text-2xl sm:text-3xl font-bold mb-1">{(stat.value || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Timeline Chart */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-5 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        {t('admin', 'activity30Days')}
                      </h3>
                      <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-zinc-800">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {t('admin', 'days30')}
                      </span>
                    </div>
                    {globalAnalytics?.timeline?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={globalAnalytics.timeline}>
                          <defs>
                            <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#d946ef" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                          <YAxis stroke="#52525b" fontSize={10} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                            labelStyle={{ color: '#a1a1aa' }}
                          />
                          <Area type="monotone" dataKey="clicks" stroke="#d946ef" strokeWidth={2} fillOpacity={1} fill="url(#colorClicks)" name={t('admin', 'clicks')} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p>{t('admin', 'noData')}</p>
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {/* Geography */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="p-5 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-400" />
                        {t('admin', 'geographyClicks')}
                      </h3>
                    </div>
                    {globalAnalytics?.by_country?.length > 0 ? (
                      <div className="space-y-3">
                        {globalAnalytics.by_country.slice(0, 6).map((item, idx) => {
                          const maxClicks = globalAnalytics.by_country[0]?.clicks || 1;
                          const percentage = ((item.clicks / maxClicks) * 100);
                          return (
                            <div key={idx} className="group">
                              <div className="flex items-center gap-3">
                                <span className="text-lg w-7">{getCountryFlag(item.country)}</span>
                                <div className="flex-1">
                                  <div className="flex justify-between text-sm mb-1.5">
                                    <span className="font-medium">{item.country || t('admin', 'unknown')}</span>
                                    <span className="text-muted-foreground">{item.clicks}</span>
                                  </div>
                                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percentage}%` }}
                                      transition={{ duration: 0.6, delay: 0.4 + idx * 0.05 }}
                                      className="h-full rounded-full bg-gradient-to-r from-primary to-purple-500"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Globe className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p>{t('admin', 'noData')}</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Distribution Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Plans Distribution */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-5 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
                  >
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-purple-400" />
                      {t('admin', 'planDistribution')}
                    </h3>
                    <div className="flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={180}>
                        <RechartsPie>
                          <Pie
                            data={planDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {planDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-2">
                      {planDistribution.map((plan) => (
                        <div key={plan.name} className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: plan.color }} />
                          <span>{plan.name}: {plan.value}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* User Status */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="p-5 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
                  >
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      {t('admin', 'userStatus')}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-3xl font-bold text-emerald-400">{users.filter(u => !u.is_banned && u.status === 'active').length}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t('admin', 'active')}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-3xl font-bold text-red-400">{users.filter(u => u.is_banned).length}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t('admin', 'bannedUsers')}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                        <p className="text-3xl font-bold text-primary">{users.filter(u => u.is_verified || u.verified).length}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t('admin', 'verifiedUsers')}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                        <p className="text-3xl font-bold">{pages.filter(p => p.status === 'active').length}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t('admin', 'activePages')}</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="mt-0">
              <div className="space-y-4">
                {users.map((user, i) => {
                  const RoleIcon = ROLE_CONFIG[user.role]?.icon || Users;
                  const isBanned = user.is_banned || user.status === 'blocked';
                  const isVerified = user.is_verified || user.verified;
                  
                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className={`p-4 rounded-2xl border transition-all ${
                        isBanned ? 'bg-red-950/20 border-red-500/20' : 'bg-zinc-900/50 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* User Info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            user.role === 'owner' ? 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20' :
                            user.role === 'admin' ? 'bg-purple-500/20' : 'bg-zinc-800'
                          }`}>
                            <RoleIcon className={`w-5 h-5 ${
                              user.role === 'owner' ? 'text-yellow-400' :
                              user.role === 'admin' ? 'text-purple-400' : 'text-zinc-400'
                            }`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold truncate">{user.username}</p>
                              {isVerified && <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />}
                              {isBanned && <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-400">{t('admin', 'ban')}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2 flex-wrap pl-14 lg:pl-0">
                          <span className={`px-2 py-1 rounded-lg text-[11px] border ${ROLE_CONFIG[user.role]?.color}`}>
                            {ROLE_CONFIG[user.role]?.label}
                          </span>
                          <span className={`px-2 py-1 rounded-lg text-[11px] ${PLAN_CONFIG[user.plan]?.color}`}>
                            {PLAN_CONFIG[user.plan]?.label}
                          </span>
                          <span className="px-2 py-1 rounded-lg text-[11px] bg-zinc-800 text-zinc-400">
                            {user.page_count || 0} {t('admin', 'pagesCount')}
                          </span>
                        </div>

                        {/* Actions */}
                        {user.role !== 'owner' && (
                          <div className="flex items-center gap-2 pl-14 lg:pl-0 flex-wrap">
                            <Button
                              size="sm"
                              variant={isVerified ? "outline" : "default"}
                              onClick={() => toggleUserVerify(user.id, isVerified)}
                              className="h-8 text-xs"
                            >
                              <BadgeCheck className="w-3.5 h-3.5 mr-1" />
                              {isVerified ? t('admin', 'revoke') : t('admin', 'grant')}
                            </Button>

                            <select
                              value={user.plan}
                              onChange={(e) => updateUserPlan(user.id, e.target.value)}
                              className="h-8 px-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs cursor-pointer hover:border-zinc-600 transition-colors"
                            >
                              <option value="free">Free</option>
                              <option value="pro">Pro</option>
                            </select>

                            {isOwner && (
                              <select
                                value={user.role}
                                onChange={(e) => updateUserRole(user.id, e.target.value)}
                                className="h-8 px-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs cursor-pointer hover:border-zinc-600 transition-colors"
                              >
                                <option value="user">User</option>
                                <option value="moderator">Mod</option>
                                <option value="admin">Admin</option>
                              </select>
                            )}

                            {user.role !== 'admin' && (
                              <Button
                                size="sm"
                                variant={isBanned ? "default" : "destructive"}
                                onClick={() => toggleUserBan(user.id, isBanned)}
                                className="h-8 text-xs"
                              >
                                {isBanned ? <Check className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Plans Tab */}
            <TabsContent value="plans" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {planConfigs.map((config, idx) => (
                  <motion.div
                    key={config.plan_name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`p-6 rounded-2xl border relative overflow-hidden ${
                      config.plan_name === 'pro' ? 'bg-gradient-to-br from-blue-950/30 to-cyan-950/30 border-blue-500/20' :
                      'bg-zinc-900/50 border-white/5'
                    }`}
                  >
                    {config.plan_name === 'pro' && (
                      <div className="absolute top-4 right-4">
                        <Crown className="w-6 h-6 text-blue-400" />
                      </div>
                    )}

                    <h3 className="text-xl font-bold capitalize mb-1">{config.plan_name}</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      {users.filter(u => u.plan === config.plan_name).length} {t('admin', 'usersCount')}
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1.5 block">{t('admin', 'pagesLimit')}</label>
                        <input
                          type="number"
                          value={config.max_pages_limit}
                          onChange={(e) => {
                            setPlanConfigs(prev => prev.map(p => 
                              p.plan_name === config.plan_name ? {...p, max_pages_limit: parseInt(e.target.value)} : p
                            ));
                            setEditingPlan(config.plan_name);
                          }}
                          className="w-full h-10 px-3 rounded-xl bg-zinc-800/50 border border-white/10 text-sm focus:border-primary focus:outline-none transition-colors"
                          min="-1"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">{t('admin', 'unlimited')}</p>
                      </div>

                      <div>
                        <label className="text-xs text-muted-foreground mb-1.5 block">{t('admin', 'subdomainsLimit')}</label>
                        <input
                          type="number"
                          value={config.max_subdomains_limit ?? 0}
                          onChange={(e) => {
                            setPlanConfigs(prev => prev.map(p => 
                              p.plan_name === config.plan_name ? {...p, max_subdomains_limit: parseInt(e.target.value)} : p
                            ));
                            setEditingPlan(config.plan_name);
                          }}
                          className="w-full h-10 px-3 rounded-xl bg-zinc-800/50 border border-white/10 text-sm focus:border-primary focus:outline-none transition-colors"
                          min="-1"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">{t('admin', 'unlimited')}, {t('admin', 'disabled')}</p>
                      </div>

                      <div className="space-y-2.5">
                        {[
                          { key: 'has_analytics', label: t('admin', 'basicAnalytics') },
                          { key: 'has_advanced_analytics', label: t('admin', 'advancedAnalytics') },
                          { key: 'can_use_ai_generation', label: t('admin', 'aiGeneration') },
                          { key: 'can_verify_profile', label: t('admin', 'profileVerification') },
                          { key: 'can_remove_branding', label: t('admin', 'removeBranding') },
                          { key: 'priority_support', label: t('admin', 'prioritySupport') }
                        ].map(({ key, label }) => (
                          <label key={key} className="flex items-center justify-between cursor-pointer group">
                            <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">{label}</span>
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={config[key] || false}
                                onChange={(e) => {
                                  setPlanConfigs(prev => prev.map(p => 
                                    p.plan_name === config.plan_name ? {...p, [key]: e.target.checked} : p
                                  ));
                                  setEditingPlan(config.plan_name);
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-zinc-700 rounded-full peer peer-checked:bg-primary transition-colors"></div>
                              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
                            </div>
                          </label>
                        ))}
                      </div>

                      <AnimatePresence>
                        {editingPlan === config.plan_name && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                          >
                            <Button
                              onClick={() => {
                                const currentConfig = planConfigs.find(p => p.plan_name === config.plan_name);
                                updatePlanConfig(config.plan_name, {
                                  max_pages_limit: currentConfig.max_pages_limit,
                                  max_subdomains_limit: currentConfig.max_subdomains_limit,
                                  has_analytics: currentConfig.has_analytics,
                                  has_advanced_analytics: currentConfig.has_advanced_analytics,
                                  can_use_ai_generation: currentConfig.can_use_ai_generation,
                                  can_verify_profile: currentConfig.can_verify_profile,
                                  can_remove_branding: currentConfig.can_remove_branding,
                                  priority_support: currentConfig.priority_support
                                });
                              }}
                              className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                            >
                              <Save className="w-4 h-4 mr-2" />
                              {t('admin', 'saveChanges')}
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            {/* Pages Tab */}
            <TabsContent value="pages" className="mt-0">
              <div className="space-y-3">
                {pages.map((page, i) => (
                  <motion.div
                    key={page.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-14 h-14 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
                          {page.cover_image ? (
                            <img src={page.cover_image.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${page.cover_image}` : page.cover_image}
                              alt={page.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music className="w-6 h-6 text-zinc-600" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold truncate">{page.title}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                              page.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                            }`}>{page.status}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {page.user?.username || "—"} • /{page.slug}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pl-[72px] sm:pl-0">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Eye className="w-4 h-4" /> {page.views || 0}
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <MousePointer className="w-4 h-4" /> {page.total_clicks || 0}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                          <Button
                            size="sm"
                            variant={page.status === "active" ? "destructive" : "default"}
                            onClick={() => togglePageStatus(page.id)}
                            className="h-9 rounded-xl"
                          >
                            {page.status === "active" ? t('admin', 'disablePage') : t('admin', 'enablePage')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {pages.length === 0 && (
                  <div className="text-center py-20 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>{t('admin', 'noData')}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Domains Tab */}
            <TabsContent value="domains" className="mt-0">
              <div className="space-y-4">
                {/* Search */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder={t('admin', 'searchSubdomains')}
                      value={subdomainSearch}
                      onChange={(e) => {
                        setSubdomainSearch(e.target.value);
                        fetchSubdomains(e.target.value);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/50 border border-white/10 focus:border-primary focus:outline-none text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/50 border border-white/5">
                    <Globe className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">{t('common', 'total')}: <span className="font-semibold">{subdomainsTotal}</span></span>
                  </div>
                </div>

                {/* Subdomains List */}
                {subdomains.map((sub, i) => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`p-4 rounded-2xl border transition-all ${
                      sub.disabled_by_admin 
                        ? 'bg-red-950/20 border-red-500/20' 
                        : sub.is_active 
                          ? 'bg-zinc-900/50 border-white/5 hover:border-white/10' 
                          : 'bg-zinc-900/30 border-zinc-800/50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          sub.disabled_by_admin 
                            ? 'bg-red-500/20' 
                            : sub.is_active 
                              ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20' 
                              : 'bg-zinc-800'
                        }`}>
                          <Globe className={`w-5 h-5 ${
                            sub.disabled_by_admin ? 'text-red-400' : sub.is_active ? 'text-emerald-400' : 'text-zinc-500'
                          }`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-mono font-semibold">{sub.subdomain}.mytrack.cc</p>
                            {sub.disabled_by_admin && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-400">
                                {t('admin', 'banned')}
                              </span>
                            )}
                            {!sub.is_active && !sub.disabled_by_admin && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-700 text-zinc-400">
                                {t('common', 'disabled')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t('admin', 'user')}: <span className="text-foreground">{sub.owner?.username || sub.owner?.email || sub.user_id}</span>
                            {sub.owner?.email && <span className="text-zinc-500"> ({sub.owner.email})</span>}
                            {" • "}
                            {new Date(sub.created_at).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pl-14 sm:pl-0">
                        <a 
                          href={`https://${sub.subdomain}.mytrack.cc`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                        <Button
                          size="sm"
                          variant={sub.disabled_by_admin ? "default" : "destructive"}
                          onClick={() => toggleSubdomainAdmin(sub.id, sub.disabled_by_admin)}
                          className="h-9 rounded-xl"
                        >
                          {sub.disabled_by_admin ? (
                            <>
                              <Check className="w-4 h-4 sm:mr-1" />
                              <span className="hidden sm:inline">{t('admin', 'enableSubdomain')}</span>
                            </>
                          ) : (
                            <>
                              <Ban className="w-4 h-4 sm:mr-1" />
                              <span className="hidden sm:inline">{t('admin', 'disableSubdomain')}</span>
                            </>
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteSubdomainAdmin(sub.id)}
                          className="h-9 w-9 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {subdomains.length === 0 && (
                  <div className="text-center py-20 text-muted-foreground">
                    <Link2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>{t('admin', 'noData')}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tickets Tab */}
            <TabsContent value="tickets" className="mt-0">
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <select
                    value={ticketStatusFilter}
                    onChange={(e) => {
                      setTicketStatusFilter(e.target.value);
                      fetchTickets();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900/50 border border-white/10 focus:border-primary focus:outline-none text-sm"
                  >
                    <option value="">Все статусы</option>
                    <option value="open">Открытые</option>
                    <option value="in_progress">В работе</option>
                    <option value="resolved">Решённые</option>
                    <option value="closed">Закрытые</option>
                  </select>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/50 border border-white/5">
                    <MessageCircle className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">Всего: <span className="font-semibold">{ticketsTotal}</span></span>
                    {unreadTickets > 0 && (
                      <span className="ml-2 px-2 py-1 rounded-full bg-red-500 text-white text-xs">
                        {unreadTickets} непрочитанных
                      </span>
                    )}
                  </div>
                </div>

                {/* Tickets List */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Tickets List */}
                  <div className="space-y-3">
                    {tickets.map((ticket, i) => {
                      const statusConfig = TICKET_STATUS_CONFIG[ticket.status] || TICKET_STATUS_CONFIG.open;
                      const StatusIcon = statusConfig.icon;
                      
                      return (
                        <motion.div
                          key={ticket.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            selectedTicket?.id === ticket.id
                              ? 'bg-primary/10 border-primary/30'
                              : !ticket.is_read_by_staff
                                ? 'bg-blue-950/20 border-blue-500/20 hover:border-blue-500/40'
                                : 'bg-zinc-900/50 border-white/5 hover:border-white/10'
                          }`}
                          onClick={() => openTicket(ticket.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}
                                 style={{ backgroundColor: statusConfig.color + '20' }}>
                              <StatusIcon className="w-5 h-5" style={{ color: statusConfig.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold truncate">{ticket.subject}</h3>
                                {!ticket.is_read_by_staff && (
                                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                От: {ticket.user?.username || ticket.user?.email}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="px-2 py-1 rounded-lg text-xs border"
                                      style={{ 
                                        backgroundColor: statusConfig.color + '20',
                                        borderColor: statusConfig.color + '30',
                                        color: statusConfig.color
                                      }}>
                                  {statusConfig.label}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(ticket.created_at).toLocaleDateString('ru-RU')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    
                    {tickets.length === 0 && (
                      <div className="text-center py-20 text-muted-foreground">
                        <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Тикеты не найдены</p>
                      </div>
                    )}
                  </div>

                  {/* Ticket Details */}
                  <div className="lg:sticky lg:top-4">
                    {selectedTicket ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h2 className="text-xl font-semibold mb-2">{selectedTicket.subject}</h2>
                            <p className="text-sm text-muted-foreground">
                              От: {selectedTicket.user?.username || selectedTicket.user?.email}
                            </p>
                          </div>
                          <select
                            value={selectedTicket.status}
                            onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value)}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm"
                          >
                            <option value="open">Открыт</option>
                            <option value="in_progress">В работе</option>
                            <option value="resolved">Решён</option>
                            <option value="closed">Закрыт</option>
                          </select>
                        </div>

                        {/* Messages */}
                        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                          {selectedTicket.messages?.map((message, idx) => (
                            <div key={idx} className={`p-4 rounded-xl ${
                              message.is_staff_reply 
                                ? 'bg-primary/10 border border-primary/20 ml-4' 
                                : 'bg-zinc-800/50 mr-4'
                            }`}>
                              <div className="flex items-center gap-2 mb-2">
                                <User className="w-4 h-4" />
                                <span className="text-sm font-medium">
                                  {message.is_staff_reply ? 'Поддержка' : (selectedTicket.user?.username || 'Пользователь')}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(message.created_at).toLocaleString('ru-RU')}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                            </div>
                          ))}
                        </div>

                        {/* Reply Form */}
                        <div className="space-y-3">
                          <Textarea
                            placeholder="Ваш ответ..."
                            value={ticketReply}
                            onChange={(e) => setTicketReply(e.target.value)}
                            className="min-h-[100px] bg-zinc-800/50 border-white/10 focus:border-primary"
                          />
                          <Button 
                            onClick={sendTicketReply}
                            disabled={!ticketReply.trim()}
                            className="w-full bg-gradient-to-r from-primary to-purple-600"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Отправить ответ
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 text-center text-muted-foreground">
                        <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Выберите тикет для просмотра</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Verification Tab */}
            <TabsContent value="verification" className="mt-0">
              <div className="space-y-4">
                {verificationRequests.filter(r => r.status === 'pending').map((req, i) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-5 rounded-2xl bg-zinc-900/50 border border-white/5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{req.artist_name}</span>
                          <span className="text-sm text-muted-foreground">@{req.username}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{req.email}</p>
                        {req.social_links && (
                          <p className="text-sm"><span className="text-muted-foreground">Соц. сети:</span> {req.social_links}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(req.created_at).toLocaleString('ru-RU')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => approveVerification(req.user_id)} className="bg-emerald-600 hover:bg-emerald-700">
                          <Check className="w-4 h-4 sm:mr-1" />
                          <span className="hidden sm:inline">Одобрить</span>
                        </Button>
                        <Button variant="destructive" onClick={() => rejectVerification(req.user_id)}>
                          <X className="w-4 h-4 sm:mr-1" />
                          <span className="hidden sm:inline">Отклонить</span>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {verificationRequests.filter(r => r.status === 'pending').length === 0 && (
                  <div className="text-center py-20 text-muted-foreground">
                    <BadgeCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Нет ожидающих заявок</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* System Tab - Only for Owner/Admin */}
            {canViewVPS && (
              <TabsContent value="system" className="mt-0">
                {systemMetrics ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    {/* CPU */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 rounded-2xl bg-gradient-to-br from-blue-950/30 to-cyan-950/30 border border-blue-500/20"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-5 h-5 text-blue-400" />
                          <h3 className="font-semibold">CPU</h3>
                        </div>
                        <span className="text-xs text-muted-foreground">{systemMetrics.cpu?.count} cores</span>
                      </div>
                      <p className="text-4xl font-bold mb-3">{systemMetrics.cpu?.percent?.toFixed(1)}%</p>
                      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${systemMetrics.cpu?.percent}%` }}
                          transition={{ duration: 0.5 }}
                          className={`h-full ${getProgressColor(systemMetrics.cpu?.percent)} rounded-full`}
                        />
                      </div>
                    </motion.div>

                    {/* Memory */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-teal-950/30 border border-emerald-500/20"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-emerald-400" />
                          <h3 className="font-semibold">Память</h3>
                        </div>
                      </div>
                      <p className="text-4xl font-bold mb-1">{systemMetrics.memory?.percent?.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        {systemMetrics.memory?.used_gb?.toFixed(1) || '0'} / {systemMetrics.memory?.total_gb?.toFixed(1) || '0'} GB
                      </p>
                      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${systemMetrics.memory?.percent}%` }}
                          transition={{ duration: 0.5, delay: 0.1 }}
                          className={`h-full ${getProgressColor(systemMetrics.memory?.percent)} rounded-full`}
                        />
                      </div>
                    </motion.div>

                    {/* Disk */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="p-6 rounded-2xl bg-gradient-to-br from-purple-950/30 to-pink-950/30 border border-purple-500/20"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-5 h-5 text-purple-400" />
                          <h3 className="font-semibold">Диск</h3>
                        </div>
                      </div>
                      <p className="text-4xl font-bold mb-1">{systemMetrics.disk?.percent?.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        {systemMetrics.disk?.used_gb?.toFixed(1) || '0'} / {systemMetrics.disk?.total_gb?.toFixed(1) || '0'} GB
                      </p>
                      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${systemMetrics.disk?.percent}%` }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                          className={`h-full ${getProgressColor(systemMetrics.disk?.percent)} rounded-full`}
                        />
                      </div>
                    </motion.div>

                    {/* Network */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 md:col-span-2"
                    >
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-400" />
                        Сеть
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">↑ Отправлено</p>
                          <p className="text-2xl font-bold">{systemMetrics.network?.sent_mb?.toFixed(1) || '0'} MB</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">↓ Получено</p>
                          <p className="text-2xl font-bold">{systemMetrics.network?.recv_mb?.toFixed(1) || '0'} MB</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Uptime */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
                    >
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-emerald-400" />
                        Аптайм
                      </h3>
                      <p className="text-2xl font-bold text-emerald-400">{systemMetrics.uptime || '—'}</p>
                    </motion.div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-muted-foreground">
                    <Server className="w-12 h-12 mx-auto mb-3 opacity-30 animate-pulse" />
                    <p>Загрузка метрик...</p>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </Sidebar>
  );
}
