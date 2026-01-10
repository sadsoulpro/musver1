import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { api } from "@/App";
import { toast } from "sonner";
import { ArrowLeft, Eye, MousePointer, TrendingUp } from "lucide-react";
import { FaSpotify, FaApple, FaYoutube, FaSoundcloud, FaLink, FaYandex, FaVk, FaAmazon, FaItunes } from "react-icons/fa";
import { SiTidal } from "react-icons/si";
import { motion } from "framer-motion";

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

const PLATFORMS = {
  yandex: { name: "Яндекс Музыка", icon: FaYandex, color: "#FFCC00" },
  youtube: { name: "YouTube", icon: FaYoutube, color: "#FF0000" },
  apple: { name: "Apple Music", icon: FaApple, color: "#FA233B" },
  itunes: { name: "iTunes", icon: FaItunes, color: "#EA4CC0" },
  spotify: { name: "Spotify", icon: FaSpotify, color: "#1DB954" },
  vk: { name: "VK Музыка", icon: FaVk, color: "#4C75A3" },
  deezer: { name: "Deezer", icon: DeezerIcon, color: "#A238FF" },
  zvuk: { name: "Звук", icon: ZvukIcon, color: "#6B4EFF" },
  mts: { name: "МТС Музыка", icon: MtsIcon, color: "#E30611" },
  amazon: { name: "Amazon Music", icon: FaAmazon, color: "#FF9900" },
  tidal: { name: "Tidal", icon: SiTidal, color: "#000000" },
  soundcloud: { name: "SoundCloud", icon: FaSoundcloud, color: "#FF5500" },
  custom: { name: "Другая ссылка", icon: FaLink, color: "#888888" },
};

export default function Analytics() {
  const { pageId } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [pageId]);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get(`/analytics/${pageId}`);
      setAnalytics(response.data);
    } catch (error) {
      toast.error("Не удалось загрузить аналитику");
    } finally {
      setLoading(false);
    }
  };

  const getPlatformInfo = (platformId) => {
    return PLATFORMS[platformId] || PLATFORMS.custom;
  };

  const ctr = analytics && analytics.views > 0 
    ? ((analytics.total_clicks / analytics.views) * 100).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Аналитика не найдена</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
          <Link to="/multilinks">
            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-semibold text-sm sm:text-base truncate">Статистика страницы</h1>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">Просмотры</span>
            </div>
            <p className="text-2xl sm:text-4xl font-semibold" data-testid="page-views">
              {analytics.views.toLocaleString()}
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <MousePointer className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">Клики</span>
            </div>
            <p className="text-2xl sm:text-4xl font-semibold" data-testid="total-clicks">
              {analytics.total_clicks.toLocaleString()}
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">CTR</span>
            </div>
            <p className="text-2xl sm:text-4xl font-semibold" data-testid="click-rate">
              {ctr}%
            </p>
          </motion.div>
        </div>
        
        {/* Clicks by Platform */}
        <section>
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Клики по платформам</h2>
          <div className="space-y-2 sm:space-y-3">
            {analytics.links?.map((link, i) => {
              const platform = getPlatformInfo(link.platform);
              const Icon = platform.icon;
              const percentage = analytics.total_clicks > 0 
                ? ((link.clicks / analytics.total_clicks) * 100).toFixed(1)
                : 0;
              
              return (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-3 sm:p-4 rounded-xl bg-zinc-900/50 border border-white/5"
                  data-testid={`platform-stat-${link.platform}`}
                >
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div 
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: platform.color }}
                      >
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <span className="font-medium text-sm sm:text-base">{platform.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm sm:text-base">{link.clicks.toLocaleString()}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{percentage}%</p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-1.5 sm:h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, delay: 0.3 + i * 0.05 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: platform.color }}
                    />
                  </div>
                </motion.div>
              );
            })}
            
            {(!analytics.links || analytics.links.length === 0) && (
              <p className="text-center text-muted-foreground text-sm py-6 sm:py-8 border border-dashed border-zinc-800 rounded-xl">
                Данные по платформам пока отсутствуют. Добавьте ссылки на свою страницу.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
