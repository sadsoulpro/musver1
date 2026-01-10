import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Music, ExternalLink } from "lucide-react";
import { FaSpotify, FaApple, FaYoutube, FaSoundcloud, FaLink, FaYandex, FaVk, FaAmazon, FaItunes } from "react-icons/fa";
import { SiTidal } from "react-icons/si";
import { motion } from "framer-motion";
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
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPage();
  }, [slug]);

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-zinc-950" data-testid="public-page">
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
      
      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Glass Card */}
        <div className="glass rounded-3xl p-8 text-center">
          {/* Cover Image */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl mx-auto mb-6 overflow-hidden shadow-2xl neon-glow"
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
                <Music className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
          </motion.div>
          
          {/* Artist Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="font-display text-2xl sm:text-3xl uppercase tracking-tight mb-1" data-testid="artist-name">
              {page.artist_name}
            </h1>
            <p className="text-lg text-zinc-400 mb-2" data-testid="release-title">
              {page.release_title}
            </p>
            {page.description && (
              <p className="text-sm text-zinc-500 mb-6 max-w-xs mx-auto" data-testid="description">
                {page.description}
              </p>
            )}
          </motion.div>
          
          {/* Links */}
          <div className="space-y-3 mt-8">
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
                  className="w-full flex items-center justify-between bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-primary/50 text-white p-4 rounded-xl transition-all group link-hover"
                  data-testid={`link-${link.platform}`}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ backgroundColor: platform.color }}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-medium">{platform.name}</span>
                  </div>
                  <ExternalLink className="w-5 h-5 text-zinc-500 group-hover:text-primary transition-colors" />
                </motion.button>
              );
            })}
            
            {(!page.links || page.links.length === 0) && (
              <p className="text-muted-foreground py-8">No links available</p>
            )}
          </div>
          
          {/* QR Code - only show if enabled */}
          {page.qr_enabled !== false && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-8 flex flex-col items-center"
            >
              <div className="p-3 bg-white rounded-xl shadow-lg">
                <QRCodeSVG
                  value={window.location.href}
                  size={100}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#18181b"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">Сканируйте, чтобы поделиться</p>
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
