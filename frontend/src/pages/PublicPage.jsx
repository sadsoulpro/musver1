import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Music, Share2, Copy, Check, BadgeCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { FaSpotify, FaApple, FaYoutube, FaSoundcloud, FaLink, FaYandex, FaVk, FaAmazon, FaItunes } from "react-icons/fa";
import { SiTidal } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Custom SVG icons for platforms without react-icons support
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
  yandex: { name: "Яндекс Музыка", icon: FaYandex, color: "#FFCC00", bgClass: "platform-yandex" },
  youtube: { name: "YouTube", icon: FaYoutube, color: "#FF0000", bgClass: "platform-youtube" },
  apple: { name: "Apple Music", icon: FaApple, color: "#FA233B", bgClass: "platform-apple" },
  itunes: { name: "iTunes", icon: FaItunes, color: "#EA4CC0", bgClass: "platform-itunes" },
  spotify: { name: "Spotify", icon: FaSpotify, color: "#1DB954", bgClass: "platform-spotify" },
  vk: { name: "VK Музыка", icon: FaVk, color: "#4C75A3", bgClass: "platform-vk" },
  deezer: { name: "Deezer", icon: DeezerIcon, color: "#A238FF", bgClass: "platform-deezer" },
  zvuk: { name: "Звук", icon: ZvukIcon, color: "#6B4EFF", bgClass: "platform-zvuk" },
  mts: { name: "МТС Музыка", icon: MtsIcon, color: "#E30611", bgClass: "platform-mts" },
  amazon: { name: "Amazon Music", icon: FaAmazon, color: "#FF9900", bgClass: "platform-amazon" },
  tidal: { name: "Tidal", icon: SiTidal, color: "#000000", bgClass: "platform-tidal" },
  soundcloud: { name: "SoundCloud", icon: FaSoundcloud, color: "#FF5500", bgClass: "platform-soundcloud" },
  custom: { name: "Слушать", icon: FaLink, color: "#888888", bgClass: "" },
};

export default function PublicPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [userPages, setUserPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(-1);

  useEffect(() => {
    fetchPage();
  }, [slug]);

  // Fetch user's other pages for navigation
  useEffect(() => {
    if (page?.site_navigation_enabled && page?.user_id) {
      fetchUserPages();
    }
  }, [page?.site_navigation_enabled, page?.user_id]);

  const fetchUserPages = async () => {
    try {
      const response = await axios.get(`${API}/users/${page.user_id}/pages`);
      const pages = response.data;
      setUserPages(pages);
      const index = pages.findIndex(p => p.slug === slug);
      setCurrentPageIndex(index);
    } catch (err) {
      console.error("Failed to fetch user pages", err);
    }
  };

  const goToPreviousPage = () => {
    if (userPages.length < 2) return;
    // Бесконечная прокрутка - если на первой, перейти на последнюю
    const prevIndex = currentPageIndex <= 0 ? userPages.length - 1 : currentPageIndex - 1;
    const prevPage = userPages[prevIndex];
    navigate(`/${prevPage.slug}`);
  };

  const goToNextPage = () => {
    if (userPages.length < 2) return;
    // Бесконечная прокрутка - если на последней, перейти на первую
    const nextIndex = currentPageIndex >= userPages.length - 1 ? 0 : currentPageIndex + 1;
    const nextPage = userPages[nextIndex];
    navigate(`/${nextPage.slug}`);
  };

  const goBack = () => {
    // Вернуться на предыдущую страницу в истории или на главную
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const showNavigation = page?.site_navigation_enabled && userPages.length >= 2;

  // Update OG meta tags when page data loads
  useEffect(() => {
    if (!page) return;

    const baseUrl = window.location.origin;
    const coverUrl = getCoverUrl(page.cover_image);
    const pageUrl = `${baseUrl}/${slug}`;
    const title = `${page.artist_name} - ${page.release_title}`;
    const description = page.description || `Listen to ${page.release_title} by ${page.artist_name} on all platforms`;

    // Helper to set or create meta tag
    const setMetaTag = (property, content) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Helper for name-based meta tags
    const setNameMetaTag = (name, content) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Set page title
    document.title = `${title} | MyTrack`;

    // Open Graph tags
    setMetaTag('og:title', title);
    setMetaTag('og:description', description);
    setMetaTag('og:url', pageUrl);
    setMetaTag('og:type', 'music.song');
    setMetaTag('og:site_name', 'MyTrack');
    if (coverUrl) {
      setMetaTag('og:image', coverUrl);
      setMetaTag('og:image:width', '1000');
      setMetaTag('og:image:height', '1000');
    }

    // Twitter Card tags
    setNameMetaTag('twitter:card', 'summary_large_image');
    setNameMetaTag('twitter:title', title);
    setNameMetaTag('twitter:description', description);
    if (coverUrl) {
      setNameMetaTag('twitter:image', coverUrl);
    }

    // Cleanup on unmount
    return () => {
      document.title = 'MyTrack';
    };
  }, [page, slug]);

  const fetchPage = async () => {
    try {
      const response = await axios.get(`${API}/artist/${slug}`);
      setPage(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Page not found");
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (link) => {
    // Track click via redirect endpoint
    window.open(`${API}/click/${link.id}`, "_blank");
  };

  const handleShare = async (type = "link") => {
    // Track share
    try {
      await axios.post(`${API}/track/share/${page.id}?share_type=${type}`);
    } catch (e) {
      console.log("Share tracking failed");
    }
    
    const url = `${window.location.origin}/${slug}`;
    
    if (type === "link") {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (type === "social" && navigator.share) {
      try {
        await navigator.share({
          title: `${page.artist_name} - ${page.release_title}`,
          text: `Послушай ${page.release_title} от ${page.artist_name}`,
          url: url
        });
      } catch (e) {
        // User cancelled or error
      }
    }
  };

  const handleQRShare = async () => {
    // Track QR share
    try {
      await axios.post(`${API}/track/share/${page.id}?share_type=qr`);
    } catch (e) {
      console.log("QR tracking failed");
    }
  };

  const getPlatformInfo = (platformId) => {
    return PLATFORMS[platformId] || PLATFORMS.custom;
  };

  const getCoverUrl = (url) => {
    if (!url) return null;
    return url.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${url}` : url;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center mb-6">
          <Music className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Page Not Found</h1>
        <p className="text-muted-foreground">This smart link doesn't exist or has been disabled.</p>
      </div>
    );
  }

  const coverUrl = getCoverUrl(page.cover_image);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-hidden bg-zinc-950" data-testid="public-page">
      {/* Blurred Background */}
      {coverUrl && (
        <div 
          className="fixed inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${coverUrl})`,
            filter: 'blur(80px)',
            transform: 'scale(1.3)',
            opacity: 0.3,
          }}
        />
      )}
      
      {/* Gradient Overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950" />
      
      {/* Navigation Arrows */}
      <AnimatePresence>
        {showNavigation && (
          <>
            {/* Previous Page Arrow - always visible with infinite scroll */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={goToPreviousPage}
              className="fixed left-2 sm:left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 group"
              aria-label="Previous page"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-zinc-900/80 border border-white/10 backdrop-blur-sm flex items-center justify-center group-hover:border-primary/50 group-hover:bg-zinc-800/80 transition-all group-active:scale-95">
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white/70 group-hover:text-primary transition-colors" />
                </div>
              </div>
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden sm:block">
                <div className="bg-zinc-900/90 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 whitespace-nowrap">
                  <p className="text-xs text-muted-foreground">Предыдущий</p>
                  <p className="text-sm font-medium truncate max-w-[120px]">
                    {userPages[(currentPageIndex <= 0 ? userPages.length : currentPageIndex) - 1]?.release_title}
                  </p>
                </div>
              </div>
            </motion.button>
            
            {/* Next Page Arrow - always visible with infinite scroll */}
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={goToNextPage}
              className="fixed right-2 sm:right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 group"
              aria-label="Next page"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-zinc-900/80 border border-white/10 backdrop-blur-sm flex items-center justify-center group-hover:border-primary/50 group-hover:bg-zinc-800/80 transition-all group-active:scale-95">
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white/70 group-hover:text-primary transition-colors" />
                </div>
              </div>
              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden sm:block">
                <div className="bg-zinc-900/90 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 whitespace-nowrap text-right">
                  <p className="text-xs text-muted-foreground">Следующий</p>
                  <p className="text-sm font-medium truncate max-w-[120px]">
                    {userPages[(currentPageIndex >= userPages.length - 1 ? -1 : currentPageIndex) + 1]?.release_title}
                  </p>
                </div>
              </div>
            </motion.button>
          </>
        )}
      </AnimatePresence>
          </div>
        </div>
      </motion.button>
      
      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Glass Card */}
        <div className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-center">
          {/* Cover Image */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-xl sm:rounded-2xl mx-auto mb-4 sm:mb-6 overflow-hidden shadow-2xl neon-glow"
          >
            {coverUrl ? (
              <img 
                src={coverUrl}
                alt={page.title}
                className="w-full h-full object-cover"
                data-testid="cover-image"
              />
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                <Music className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground" />
              </div>
            )}
          </motion.div>
          
          {/* Artist Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl uppercase tracking-tight mb-1 flex items-center justify-center gap-1 sm:gap-2" data-testid="artist-name">
              {page.artist_name}
              {page.user_verified && (
                <span className="relative group">
                  <BadgeCheck className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-800 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Артист подтвержден
                  </span>
                </span>
              )}
            </h1>
            <p className="text-base sm:text-lg text-zinc-400 mb-1 sm:mb-2" data-testid="release-title">
              {page.release_title}
            </p>
            {page.description && (
              <p className="text-xs sm:text-sm text-zinc-500 mb-4 sm:mb-6 max-w-xs mx-auto" data-testid="description">
                {page.description}
              </p>
            )}
          </motion.div>
          
          {/* Links */}
          <div className="space-y-2 sm:space-y-3 mt-6 sm:mt-8">
            {page.links?.map((link, i) => {
              const platform = getPlatformInfo(link.platform);
              const Icon = platform.icon;
              
              return (
                <motion.button
                  key={link.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  onClick={() => handleClick(link)}
                  className="w-full flex items-center justify-between bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-primary/50 text-white p-3 sm:p-4 rounded-lg sm:rounded-xl transition-all group link-hover"
                  data-testid={`link-${link.platform}`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div 
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ backgroundColor: platform.color }}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <span className="font-medium text-sm sm:text-base">{platform.name}</span>
                  </div>
                  <span className="text-xs sm:text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    Слушать
                  </span>
                </motion.button>
              );
            })}
            
            {(!page.links || page.links.length === 0) && (
              <p className="text-muted-foreground py-8">No links available</p>
            )}
          </div>
          
          {/* Share Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex gap-2 sm:gap-3 mt-5 sm:mt-6 justify-center"
          >
            <button
              onClick={() => handleShare("link")}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-zinc-800/80 hover:bg-zinc-700 border border-white/10 rounded-lg text-xs sm:text-sm transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                  <span className="text-green-500">Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Скопировать</span>
                </>
              )}
            </button>
            
            {typeof navigator !== 'undefined' && navigator.share && (
              <button
                onClick={() => handleShare("social")}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-lg text-xs sm:text-sm transition-all"
              >
                <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                <span>Поделиться</span>
              </button>
            )}
          </motion.div>
          
          {/* QR Code - only show if enabled */}
          {page.qr_enabled !== false && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-6 sm:mt-8 flex flex-col items-center"
              onClick={handleQRShare}
            >
              <div className="p-2 sm:p-3 bg-white rounded-lg sm:rounded-xl shadow-lg cursor-pointer hover:scale-105 transition-transform">
                <QRCodeSVG
                  value={`${process.env.REACT_APP_BACKEND_URL}/api/qr/${page.id}`}
                  size={80}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#18181b"
                  className="sm:hidden"
                />
                <QRCodeSVG
                  value={`${process.env.REACT_APP_BACKEND_URL}/api/qr/${page.id}`}
                  size={100}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#18181b"
                  className="hidden sm:block"
                />
              </div>
              <p className="text-[10px] sm:text-xs text-zinc-500 mt-2">Сканируйте, чтобы поделиться</p>
            </motion.div>
          )}
        </div>
        
        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center"
        >
          <a 
            href="/" 
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-400 transition-colors text-sm"
          >
            <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
              <Music className="w-3 h-3 text-primary" />
            </div>
            Powered by MyTrack
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
}
