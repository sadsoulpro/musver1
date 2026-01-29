import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Music, Share2, Copy, Check, BadgeCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { FaSpotify, FaApple, FaYoutube, FaAmazon, FaItunes, FaGoogle, FaNapster, FaBandcamp } from "react-icons/fa";
import { SiTidal, SiPandora, SiAudiomack } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import { useLanguage } from "@/contexts/LanguageContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Custom SVG icon components using uploaded SVG files
const SoundCloudIcon = (props) => (
  <img src="/icons/sc-mus.svg" alt="SoundCloud" className={props.className} style={{ width: '1.8em', height: '1.8em', ...props.style }} />
);

const TikTokIcon = (props) => (
  <img src="/icons/tik-tok.svg" alt="TikTok" className={props.className} style={{ width: '1.8em', height: '1.8em', ...props.style }} />
);

const VKMusicIcon = (props) => (
  <img src="/icons/vk-mus.svg" alt="VK Музыка" className={props.className} style={{ width: '1.8em', height: '1.8em', ...props.style }} />
);

const YandexMusicIcon = (props) => (
  <img src="/icons/yandex-mus.svg" alt="Яндекс Музыка" className={props.className} style={{ width: '1.8em', height: '1.8em', ...props.style }} />
);

const CustomLinkIcon = (props) => (
  <img src="/icons/link.svg" alt="Ссылка" className={props.className} style={{ width: '1.5em', height: '1.5em', ...props.style }} />
);

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

// YouTube Music icon using uploaded SVG
const YouTubeMusicIcon = (props) => (
  <img src="/icons/youtube-music.svg" alt="YouTube Music" className={props.className} style={{ width: '1.8em', height: '1.8em', ...props.style }} />
);

// Google Play Music icon
const GooglePlayIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
  </svg>
);

// Pandora icon (fallback)
const PandoraIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15v-4H8v-2h2V9c0-1.71 1.39-3 3.1-3H16v2h-2.9c-.59 0-1.1.51-1.1 1v2h4v2h-4v4h-2z"/>
  </svg>
);

// Audius icon
const AudiusIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="12" cy="12" r="10" fill="currentColor"/>
    <path d="M8 16V8l8 4-8 4z" fill="white"/>
  </svg>
);

// Anghami icon
const AnghamiIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="12" cy="12" r="10" fill="currentColor"/>
    <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="white"/>
  </svg>
);

// Boomplay icon
const BoomplayIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="12" cy="12" r="10" fill="currentColor"/>
    <path d="M10 8v8l6-4-6-4z" fill="white"/>
  </svg>
);

// Spinrilla icon
const SpinrillaIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="12" cy="12" r="10" fill="currentColor"/>
    <circle cx="12" cy="12" r="4" fill="white"/>
  </svg>
);

// Platform definitions (names come from translations)
const PLATFORMS = {
  spotify: { icon: FaSpotify, color: "#1DB954", bgClass: "platform-spotify" },
  appleMusic: { icon: FaApple, color: "#FA233B", bgClass: "platform-apple" },
  itunes: { icon: FaItunes, color: "#EA4CC0", bgClass: "platform-itunes" },
  youtube: { icon: FaYoutube, color: "#FF0000", bgClass: "platform-youtube" },
  youtubeMusic: { icon: YouTubeMusicIcon, color: "#FF0000", bgClass: "platform-youtube", isImage: true },
  yandex: { icon: YandexMusicIcon, color: "#000000", bgClass: "platform-yandex", isImage: true },
  vk: { icon: VKMusicIcon, color: "#000000", bgClass: "platform-vk", isImage: true },
  tiktok: { icon: TikTokIcon, color: "#000000", bgClass: "platform-tiktok", isImage: true },
  deezer: { icon: DeezerIcon, color: "#A238FF", bgClass: "platform-deezer" },
  tidal: { icon: SiTidal, color: "#000000", bgClass: "platform-tidal" },
  amazonMusic: { icon: FaAmazon, color: "#FF9900", bgClass: "platform-amazon" },
  amazonStore: { icon: FaAmazon, color: "#FF9900", bgClass: "platform-amazon" },
  soundcloud: { icon: SoundCloudIcon, color: "#000000", bgClass: "platform-soundcloud", isImage: true },
  pandora: { icon: PandoraIcon, color: "#005483", bgClass: "platform-pandora" },
  napster: { icon: FaNapster, color: "#000000", bgClass: "platform-napster" },
  audiomack: { icon: SiAudiomack, color: "#FFA200", bgClass: "platform-audiomack" },
  audius: { icon: AudiusIcon, color: "#CC0FE0", bgClass: "platform-audius" },
  anghami: { icon: AnghamiIcon, color: "#6C3694", bgClass: "platform-anghami" },
  boomplay: { icon: BoomplayIcon, color: "#E11B22", bgClass: "platform-boomplay" },
  spinrilla: { icon: SpinrillaIcon, color: "#121212", bgClass: "platform-spinrilla" },
  bandcamp: { icon: FaBandcamp, color: "#629AA9", bgClass: "platform-bandcamp" },
  google: { icon: FaGoogle, color: "#4285F4", bgClass: "platform-google" },
  googleStore: { icon: GooglePlayIcon, color: "#34A853", bgClass: "platform-google" },
  zvuk: { icon: ZvukIcon, color: "#6B4EFF", bgClass: "platform-zvuk" },
  mts: { icon: MtsIcon, color: "#E30611", bgClass: "platform-mts" },
  // Legacy mappings for backward compatibility
  apple: { icon: FaApple, color: "#FA233B", bgClass: "platform-apple" },
  amazon: { icon: FaAmazon, color: "#FF9900", bgClass: "platform-amazon" },
  custom: { icon: CustomLinkIcon, color: "#888888", bgClass: "", isImage: true },
};

export default function PublicPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
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
  }, [page?.site_navigation_enabled, page?.user_id, slug]);

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
    document.title = `${title} | Mus.Link`;

    // Open Graph tags
    setMetaTag('og:title', title);
    setMetaTag('og:description', description);
    setMetaTag('og:url', pageUrl);
    setMetaTag('og:type', 'music.song');
    setMetaTag('og:site_name', 'Mus.Link');
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
      document.title = 'Mus.Link';
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
    
    // Use /api/s/{slug} for social sharing (has OG tags for bots)
    const shareUrl = `${window.location.origin}/api/s/${slug}`;
    const directUrl = `${window.location.origin}/${slug}`;
    
    if (type === "link") {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (type === "social" && navigator.share) {
      try {
        await navigator.share({
          title: `${page.artist_name} - ${page.release_title}`,
          text: `Послушай ${page.release_title} от ${page.artist_name}`,
          url: shareUrl
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
    const platform = PLATFORMS[platformId] || PLATFORMS.custom;
    return {
      ...platform,
      name: t('platforms', platformId) || platformId
    };
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
        <p className="text-muted-foreground">This smart link does not exist or has been disabled.</p>
      </div>
    );
  }

  const coverUrl = getCoverUrl(page.cover_image);
  const isLightTheme = page.page_theme === "light";

  return (
    <div 
      className={`min-h-screen flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-hidden ${
        isLightTheme ? 'bg-gray-50' : 'bg-zinc-950'
      }`} 
      data-testid="public-page"
    >
      {/* Blurred Background */}
      {coverUrl && (
        <div 
          className="fixed inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${coverUrl})`,
            filter: 'blur(80px)',
            transform: 'scale(1.3)',
            opacity: isLightTheme ? 0.15 : 0.3,
          }}
        />
      )}
      
      {/* Gradient Overlay */}
      <div className={`fixed inset-0 ${
        isLightTheme 
          ? 'bg-gradient-to-b from-transparent via-gray-50/50 to-gray-50' 
          : 'bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950'
      }`} />
      
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
                <div className={`relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full ${
                  isLightTheme 
                    ? 'bg-white/80 border-gray-200' 
                    : 'bg-zinc-900/80 border-white/10'
                } border backdrop-blur-sm flex items-center justify-center group-hover:border-primary/50 transition-all group-active:scale-95`}>
                  <ChevronLeft className={`w-5 h-5 sm:w-6 sm:h-6 ${
                    isLightTheme ? 'text-gray-600' : 'text-white/70'
                  } group-hover:text-primary transition-colors`} />
                </div>
              </div>
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden sm:block">
                <div className={`${
                  isLightTheme ? 'bg-white/90 border-gray-200' : 'bg-zinc-900/90 border-white/10'
                } backdrop-blur-sm border rounded-lg px-3 py-2 whitespace-nowrap`}>
                  <p className={`text-xs ${isLightTheme ? 'text-gray-500' : 'text-muted-foreground'}`}>Предыдущий</p>
                  <p className={`text-sm font-medium truncate max-w-[120px] ${isLightTheme ? 'text-gray-900' : ''}`}>
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
                <div className={`relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full ${
                  isLightTheme 
                    ? 'bg-white/80 border-gray-200' 
                    : 'bg-zinc-900/80 border-white/10'
                } border backdrop-blur-sm flex items-center justify-center group-hover:border-primary/50 transition-all group-active:scale-95`}>
                  <ChevronRight className={`w-5 h-5 sm:w-6 sm:h-6 ${
                    isLightTheme ? 'text-gray-600' : 'text-white/70'
                  } group-hover:text-primary transition-colors`} />
                </div>
              </div>
              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden sm:block">
                <div className={`${
                  isLightTheme ? 'bg-white/90 border-gray-200' : 'bg-zinc-900/90 border-white/10'
                } backdrop-blur-sm border rounded-lg px-3 py-2 whitespace-nowrap text-right`}>
                  <p className={`text-xs ${isLightTheme ? 'text-gray-500' : 'text-muted-foreground'}`}>Следующий</p>
                  <p className={`text-sm font-medium truncate max-w-[120px] ${isLightTheme ? 'text-gray-900' : ''}`}>
                    {userPages[(currentPageIndex >= userPages.length - 1 ? -1 : currentPageIndex) + 1]?.release_title}
                  </p>
                </div>
              </div>
            </motion.button>
          </>
        )}
      </AnimatePresence>
      
      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Glass Card */}
        <div className={`rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-center ${
          isLightTheme 
            ? 'bg-white/80 backdrop-blur-xl border border-gray-200 shadow-xl' 
            : 'glass'
        }`}>
          {/* Cover Image */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-xl sm:rounded-2xl mx-auto mb-4 sm:mb-6 overflow-hidden shadow-2xl ${
              isLightTheme ? '' : 'neon-glow'
            }`}
          >
            {coverUrl ? (
              <img 
                src={coverUrl}
                alt={page.title}
                className="w-full h-full object-cover"
                data-testid="cover-image"
              />
            ) : (
              <div className={`w-full h-full ${isLightTheme ? 'bg-gray-100' : 'bg-zinc-800'} flex items-center justify-center`}>
                <Music className={`w-12 h-12 sm:w-16 sm:h-16 ${isLightTheme ? 'text-gray-400' : 'text-muted-foreground'}`} />
              </div>
            )}
          </motion.div>
          
          {/* Artist Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className={`font-display text-xl sm:text-2xl md:text-3xl uppercase tracking-tight mb-1 flex items-center justify-center gap-1 sm:gap-2 ${
              isLightTheme ? 'text-gray-900' : 'text-white'
            }`} data-testid="artist-name">
              {page.artist_name}
              {page.user_verified && (
                <span className="relative group">
                  <BadgeCheck className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  <span className={`absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 ${
                    isLightTheme ? 'bg-white border border-gray-200' : 'bg-zinc-800'
                  } text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}>
                    Артист подтвержден
                  </span>
                </span>
              )}
            </h1>
            <p className={`text-base sm:text-lg ${isLightTheme ? 'text-gray-600' : 'text-zinc-400'} mb-1 sm:mb-2`} data-testid="release-title">
              {page.release_title}
            </p>
            {page.description && (
              <p className={`text-xs sm:text-sm ${isLightTheme ? 'text-gray-500' : 'text-zinc-500'} mb-4 sm:mb-6 max-w-xs mx-auto`} data-testid="description">
                {page.description}
              </p>
            )}
          </motion.div>
          
          {/* Links */}
          <div className="space-y-2 sm:space-y-3 mt-6 sm:mt-8">
            {page.links?.map((link, i) => {
              const platform = getPlatformInfo(link.platform);
              const Icon = platform.icon;
              const isImageIcon = platform.isImage;
              
              return (
                <motion.button
                  key={link.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  onClick={() => handleClick(link)}
                  className={`w-full flex items-center justify-between ${
                    isLightTheme 
                      ? 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-900' 
                      : 'bg-zinc-900/80 hover:bg-zinc-800 border-white/10 text-white'
                  } border hover:border-primary/50 p-3 sm:p-4 rounded-lg sm:rounded-xl transition-all group link-hover`}
                  data-testid={`link-${link.platform}`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {isImageIcon ? (
                      /* For SVG image icons - show the icon directly with proper size */
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 overflow-hidden"
                        style={{ backgroundColor: platform.color }}
                      >
                        <Icon style={{ width: '28px', height: '28px' }} />
                      </div>
                    ) : (
                      /* For react-icons - show with colored background */
                      <div 
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{ backgroundColor: platform.color }}
                      >
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                    )}
                    <span className="font-medium text-sm sm:text-base">{platform.name}</span>
                  </div>
                  <span className="text-xs sm:text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {t('common', 'Listen') || 'Слушать'}
                  </span>
                </motion.button>
              );
            })}
            
            {(!page.links || page.links.length === 0) && (
              <p className={`${isLightTheme ? 'text-gray-500' : 'text-muted-foreground'} py-8`}>No links available</p>
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
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 ${
                isLightTheme 
                  ? 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700' 
                  : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
              } border rounded-lg text-xs sm:text-sm transition-all`}
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
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-lg text-xs sm:text-sm transition-all ${
                  isLightTheme ? 'text-primary' : 'text-white'
                }`}
              >
                <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                <span className={isLightTheme ? 'text-primary' : 'text-white'}>Поделиться</span>
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
              <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl shadow-lg cursor-pointer hover:scale-105 transition-transform ${
                isLightTheme ? 'bg-gray-50 border border-gray-200' : 'bg-white'
              }`}>
                <QRCodeSVG
                  value={`${process.env.REACT_APP_BACKEND_URL}/api/qr/${page.id}`}
                  size={80}
                  level="M"
                  includeMargin={false}
                  bgColor={isLightTheme ? "#f9fafb" : "#ffffff"}
                  fgColor="#18181b"
                  className="sm:hidden"
                />
                <QRCodeSVG
                  value={`${process.env.REACT_APP_BACKEND_URL}/api/qr/${page.id}`}
                  size={100}
                  level="M"
                  includeMargin={false}
                  bgColor={isLightTheme ? "#f9fafb" : "#ffffff"}
                  fgColor="#18181b"
                  className="hidden sm:block"
                />
              </div>
              <p className={`text-[10px] sm:text-xs ${isLightTheme ? 'text-gray-500' : 'text-zinc-500'} mt-2`}>Сканируйте, чтобы поделиться</p>
            </motion.div>
          )}
        </div>
        
        {/* Branding Footer - hidden if user has can_remove_branding */}
        {!page.can_remove_branding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 text-center"
          >
            <a 
              href="/" 
              className={`inline-flex items-center gap-2 ${
                isLightTheme ? 'text-gray-400 hover:text-gray-500' : 'text-zinc-500 hover:text-zinc-400'
              } transition-colors text-sm`}
            >
              <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
                <Music className="w-3 h-3 text-primary" />
              </div>
              Powered by Mus.Link
            </a>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
