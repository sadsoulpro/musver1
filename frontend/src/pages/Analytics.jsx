import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { api, useAuth } from "@/App";
import { toast } from "sonner";
import { 
  ArrowLeft, Eye, MousePointer, TrendingUp, Globe, MapPin, 
  Lock, Crown, Calendar, Clock, BarChart3, Users, Zap
} from "lucide-react";
import { FaSpotify, FaApple, FaYoutube, FaSoundcloud, FaLink, FaYandex, FaVk, FaAmazon, FaItunes, FaGoogle, FaNapster, FaBandcamp } from "react-icons/fa";
import { SiTidal, SiPandora, SiAudiomack } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell
} from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import ProFeatureModal from "@/components/ProFeatureModal";

// Custom icons
const ZvukIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M8 8l8 4-8 4V8z" fill="currentColor"/>
  </svg>
);

const MtsIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <rect x="3" y="6" width="18" height="12" rx="2" fill="currentColor"/>
    <text x="12" y="14" fontSize="6" fill="white" textAnchor="middle" fontWeight="bold">MTC</text>
  </svg>
);

const DeezerIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M6.01 11.75H0V15h6.01v-3.25zM6.01 7.25H0v3.25h6.01V7.25zM6.01 16.25H0v3.25h6.01v-3.25zM12.005 11.75H6.01V15h5.995v-3.25zM12.005 16.25H6.01v3.25h5.995v-3.25zM17.995 11.75H12V15h5.995v-3.25zM17.995 16.25H12v3.25h5.995v-3.25zM17.995 7.25H12v3.25h5.995V7.25zM24 11.75h-6.005V15H24v-3.25zM24 16.25h-6.005v3.25H24v-3.25zM24 7.25h-6.005v3.25H24V7.25zM24 2.75h-6.005V6H24V2.75z"/>
  </svg>
);

const YouTubeMusicIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="12" cy="12" r="10" fill="currentColor"/>
    <polygon points="10,8 16,12 10,16" fill="white"/>
  </svg>
);

const GooglePlayIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
  </svg>
);

const PandoraIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15v-4H8v-2h2V9c0-1.71 1.39-3 3.1-3H16v2h-2.9c-.59 0-1.1.51-1.1 1v2h4v2h-4v4h-2z"/>
  </svg>
);

const AudiusIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="12" cy="12" r="10" fill="currentColor"/>
    <path d="M8 16V8l8 4-8 4z" fill="white"/>
  </svg>
);

const AnghamiIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="12" cy="12" r="10" fill="currentColor"/>
    <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="white"/>
  </svg>
);

const BoomplayIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="12" cy="12" r="10" fill="currentColor"/>
    <path d="M10 8v8l6-4-6-4z" fill="white"/>
  </svg>
);

const SpinrillaIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="12" cy="12" r="10" fill="currentColor"/>
    <circle cx="12" cy="12" r="4" fill="white"/>
  </svg>
);

const PLATFORMS = {
  spotify: { name: "Spotify", icon: FaSpotify, color: "#1DB954" },
  appleMusic: { name: "Apple Music", icon: FaApple, color: "#FA233B" },
  itunes: { name: "iTunes", icon: FaItunes, color: "#EA4CC0" },
  youtube: { name: "YouTube", icon: FaYoutube, color: "#FF0000" },
  youtubeMusic: { name: "YouTube Music", icon: YouTubeMusicIcon, color: "#FF0000" },
  yandex: { name: "Яндекс Музыка", icon: FaYandex, color: "#FFCC00" },
  vk: { name: "VK Музыка", icon: FaVk, color: "#4C75A3" },
  deezer: { name: "Deezer", icon: DeezerIcon, color: "#A238FF" },
  tidal: { name: "Tidal", icon: SiTidal, color: "#000000" },
  amazonMusic: { name: "Amazon Music", icon: FaAmazon, color: "#FF9900" },
  amazonStore: { name: "Amazon Store", icon: FaAmazon, color: "#FF9900" },
  soundcloud: { name: "SoundCloud", icon: FaSoundcloud, color: "#FF5500" },
  pandora: { name: "Pandora", icon: PandoraIcon, color: "#005483" },
  napster: { name: "Napster", icon: FaNapster, color: "#000000" },
  audiomack: { name: "Audiomack", icon: SiAudiomack, color: "#FFA200" },
  audius: { name: "Audius", icon: AudiusIcon, color: "#CC0FE0" },
  anghami: { name: "Anghami", icon: AnghamiIcon, color: "#6C3694" },
  boomplay: { name: "Boomplay", icon: BoomplayIcon, color: "#E11B22" },
  spinrilla: { name: "Spinrilla", icon: SpinrillaIcon, color: "#121212" },
  bandcamp: { name: "Bandcamp", icon: FaBandcamp, color: "#629AA9" },
  google: { name: "Google", icon: FaGoogle, color: "#4285F4" },
  googleStore: { name: "Google Store", icon: GooglePlayIcon, color: "#34A853" },
  zvuk: { name: "Звук", icon: ZvukIcon, color: "#6B4EFF" },
  mts: { name: "МТС Музыка", icon: MtsIcon, color: "#E30611" },
  apple: { name: "Apple Music", icon: FaApple, color: "#FA233B" },
  amazon: { name: "Amazon Music", icon: FaAmazon, color: "#FF9900" },
  custom: { name: "Other", icon: FaLink, color: "#888888" },
};

const COUNTRY_FLAGS = {
  "Россия": "🇷🇺", "США": "🇺🇸", "Украина": "🇺🇦", "Беларусь": "🇧🇾",
  "Казахстан": "🇰🇿", "Германия": "🇩🇪", "ФРГ": "🇩🇪", "Великобритания": "🇬🇧",
  "Франция": "🇫🇷", "Италия": "🇮🇹", "Испания": "🇪🇸", "Польша": "🇵🇱",
  "Нидерланды": "🇳🇱", "Канада": "🇨🇦", "Австралия": "🇦🇺", "Китай": "🇨🇳",
  "Япония": "🇯🇵", "Индия": "🇮🇳", "Бразилия": "🇧🇷", "Турция": "🇹🇷",
  "Гонконг": "🇭🇰", "Сингапур": "🇸🇬", "Латвия": "🇱🇻", "Литва": "🇱🇹",
  "Эстония": "🇪🇪", "Грузия": "🇬🇪", "Армения": "🇦🇲", "Азербайджан": "🇦🇿",
  "Узбекистан": "🇺🇿", "Молдова": "🇲🇩", "Сербия": "🇷🇸",
  "Неизвестно": "🌍", "Unknown": "🌍",
};

const getCountryFlag = (country) => COUNTRY_FLAGS[country] || "🌍";

const COLORS = ['#d946ef', '#8b5cf6', '#3b82f6', '#22c55e', '#eab308', '#ef4444', '#06b6d4', '#f97316'];

export default function Analytics() {
  const { pageId } = useParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState(null);
  const [userLimits, setUserLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [proModalOpen, setProModalOpen] = useState(false);

  const hasAdvancedAnalytics = analytics?.has_advanced_analytics || 
    user?.plan_config?.has_advanced_analytics ||
    user?.plan === 'pro';

  const handleUpgradeClick = () => {
    const submittedEmail = localStorage.getItem('waitlist_email_submitted');
    if (submittedEmail) {
      toast.info(t('proModal', 'alreadySubmitted'));
    } else {
      setProModalOpen(true);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchUserLimits();
  }, [pageId]);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get(`/analytics/${pageId}`);
      setAnalytics(response.data);
    } catch (error) {
      toast.error(t('errors', 'loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLimits = async () => {
    try {
      const response = await api.get("/my-limits");
      setUserLimits(response.data);
    } catch (error) {
      console.error("Failed to fetch limits");
    }
  };

  const getPlatformInfo = (platformId) => {
    return PLATFORMS[platformId] || PLATFORMS.custom;
  };

  const ctr = analytics && analytics.views > 0 
    ? ((analytics.total_clicks / analytics.views) * 100).toFixed(1)
    : 0;

  const platformData = analytics?.links?.map(link => ({
    name: getPlatformInfo(link.platform).name,
    value: link.clicks || 0,
    color: getPlatformInfo(link.platform).color
  })).filter(d => d.value > 0) || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
            <BarChart3 className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground">{t('common', 'loading')}</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t('analytics', 'noData')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/multilinks">
              <Button variant="ghost" size="icon" className="flex-shrink-0 rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold text-sm sm:text-base">{t('analytics', 'pageAnalytics')}</h1>
              <p className="text-xs text-muted-foreground">
                {hasAdvancedAnalytics ? t('analytics', 'proFeature') : t('analytics', 'overview')}
              </p>
            </div>
          </div>
          {!hasAdvancedAnalytics && (
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-xs"
              onClick={handleUpgradeClick}
            >
              <Crown className="w-3 h-3 mr-1" />
              {t('common', 'upgrade')}
            </Button>
          )}
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/5 border border-primary/20"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">{t('analytics', 'totalViews')}</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold" data-testid="page-views">
              {analytics.views.toLocaleString()}
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <MousePointer className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">{t('analytics', 'totalClicks')}</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold" data-testid="page-clicks">
              {analytics.total_clicks.toLocaleString()}
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">{t('analytics', 'clickRate')}</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold" data-testid="page-ctr">
              {ctr}%
            </p>
          </motion.div>
        </div>

        {/* Platform Clicks */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <h2 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            {t('analytics', 'clicksByPlatform')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {analytics.links?.filter(l => l.clicks > 0).map((link, idx) => {
              const platform = getPlatformInfo(link.platform);
              const Icon = platform.icon;
              const maxClicks = Math.max(...analytics.links.map(l => l.clicks || 0));
              const percentage = maxClicks > 0 ? ((link.clicks / maxClicks) * 100) : 0;
              
              return (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + idx * 0.05 }}
                  className="p-4 rounded-xl panel-card hover:border-border transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${platform.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: platform.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{platform.name}</p>
                      <p className="text-xs text-muted-foreground">{link.clicks} {t('common', 'clicks')}</p>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.6, delay: 0.5 + idx * 0.05 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: platform.color }}
                    />
                  </div>
                </motion.div>
              );
            })}
            
            {(!analytics.links || analytics.links.filter(l => l.clicks > 0).length === 0) && (
              <div className="col-span-full text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl">
                <MousePointer className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>{t('analytics', 'noData')}</p>
              </div>
            )}
          </div>
        </motion.section>
        
        {/* Advanced Analytics Section */}
        <AnimatePresence>
          {hasAdvancedAnalytics ? (
            <>
              {/* Geography */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-6 relative"
              >
                <h2 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  {t('analytics', 'geography')}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 font-normal ml-2">
                    PRO
                  </span>
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Countries */}
                  <div className="p-5 rounded-2xl panel-card">
                    <h3 className="font-medium mb-4 flex items-center gap-2 text-sm">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      {t('analytics', 'topCountries')}
                    </h3>
                    {analytics.by_country?.length > 0 ? (
                      <div className="space-y-3">
                        {analytics.by_country.slice(0, 5).map((item, i) => {
                          const maxClicks = analytics.by_country[0]?.clicks || 1;
                          const percentage = ((item.clicks / maxClicks) * 100);
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-lg w-7">{getCountryFlag(item.country)}</span>
                              <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="font-medium">{item.country}</span>
                                  <span className="text-muted-foreground">{item.clicks}</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 0.5, delay: 0.5 + i * 0.05 }}
                                    className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-[150px] flex items-center justify-center text-muted-foreground text-sm">
                        <div className="text-center">
                          <Globe className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p>{t('analytics', 'noData')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Cities */}
                  <div className="p-5 rounded-2xl panel-card">
                    <h3 className="font-medium mb-4 flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      {t('analytics', 'topCountries')}
                    </h3>
                    {analytics.by_city?.length > 0 ? (
                      <div className="space-y-3">
                        {analytics.by_city.slice(0, 5).map((item, i) => {
                          const maxClicks = analytics.by_city[0]?.clicks || 1;
                          const percentage = ((item.clicks / maxClicks) * 100);
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded bg-muted flex items-center justify-center text-xs font-medium">{i + 1}</div>
                              <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="font-medium">{item.city}</span>
                                  <span className="text-muted-foreground">{item.clicks}</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 0.5, delay: 0.6 + i * 0.05 }}
                                    className="h-full bg-blue-500 rounded-full"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-[150px] flex items-center justify-center text-muted-foreground text-sm">
                        <div className="text-center">
                          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p>{t('analytics', 'noData')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.section>

              {/* Platform Distribution Chart */}
              {platformData.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mb-6"
                >
                  <h2 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                    {t('analytics', 'topPlatforms')}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 font-normal ml-2">
                      PRO
                    </span>
                  </h2>
                  <div className="p-5 rounded-2xl panel-card">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={platformData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {platformData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                          formatter={(value) => [`${value} ${t('common', 'clicks')}`, t('common', 'clicks')]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </motion.section>
              )}
            </>
          ) : (
            /* Locked Section for Free Users */
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-6"
            >
              <div className="relative p-6 sm:p-10 rounded-2xl bg-card/80 border border-border overflow-hidden">
                <div className="absolute inset-0 backdrop-blur-sm bg-background/60 flex items-center justify-center z-10">
                  <div className="text-center p-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-7 h-7 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{t('analytics', 'proFeature')}</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                      {t('analytics', 'upgradeToSee')}
                    </p>
                    <Button 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      onClick={handleUpgradeClick}
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      {t('common', 'upgrade')}
                    </Button>
                  </div>
                </div>
                
                <div className="opacity-30 pointer-events-none">
                  <h2 className="text-lg font-semibold mb-4">{t('analytics', 'geography')}</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-40 rounded-xl bg-muted/50"></div>
                    <div className="h-40 rounded-xl bg-muted/50"></div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
