import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/App";
import { motion } from "framer-motion";
import { Music, ExternalLink, BadgeCheck, Globe, ArrowRight, Mail } from "lucide-react";
import { FaTelegram, FaInstagram, FaVk, FaTiktok, FaTwitter, FaGlobe, FaSpotify, FaApple, FaYoutube, FaSoundcloud, FaLink, FaYandex, FaAmazon, FaItunes, FaGoogle, FaNapster, FaBandcamp } from "react-icons/fa";
import { SiTidal, SiPandora, SiAudiomack } from "react-icons/si";

// Custom SVG icons for platforms
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

// Platform icons/colors (same as PublicPage)
const PLATFORMS = {
  spotify: { color: "#1DB954", name: "Spotify", icon: FaSpotify },
  appleMusic: { color: "#FA233B", name: "Apple Music", icon: FaApple },
  itunes: { color: "#EA4CC0", name: "iTunes", icon: FaItunes },
  youtube: { color: "#FF0000", name: "YouTube", icon: FaYoutube },
  youtubeMusic: { color: "#FF0000", name: "YouTube Music", icon: YouTubeMusicIcon },
  yandex: { color: "#FFCC00", name: "Яндекс Музыка", icon: FaYandex },
  vk: { color: "#4C75A3", name: "VK Музыка", icon: FaVk },
  deezer: { color: "#A238FF", name: "Deezer", icon: DeezerIcon },
  tidal: { color: "#000000", name: "Tidal", icon: SiTidal },
  amazonMusic: { color: "#FF9900", name: "Amazon Music", icon: FaAmazon },
  amazonStore: { color: "#FF9900", name: "Amazon Store", icon: FaAmazon },
  soundcloud: { color: "#FF5500", name: "SoundCloud", icon: FaSoundcloud },
  pandora: { color: "#005483", name: "Pandora", icon: PandoraIcon },
  napster: { color: "#000000", name: "Napster", icon: FaNapster },
  audiomack: { color: "#FFA200", name: "Audiomack", icon: SiAudiomack },
  audius: { color: "#CC0FE0", name: "Audius", icon: AudiusIcon },
  anghami: { color: "#6C3694", name: "Anghami", icon: AnghamiIcon },
  boomplay: { color: "#E11B22", name: "Boomplay", icon: BoomplayIcon },
  spinrilla: { color: "#121212", name: "Spinrilla", icon: SpinrillaIcon },
  bandcamp: { color: "#629AA9", name: "Bandcamp", icon: FaBandcamp },
  google: { color: "#4285F4", name: "Google", icon: FaGoogle },
  googleStore: { color: "#34A853", name: "Google Store", icon: GooglePlayIcon },
  zvuk: { color: "#6B4EFF", name: "Звук", icon: ZvukIcon },
  mts: { color: "#E30611", name: "МТС Музыка", icon: MtsIcon },
  // Legacy mappings
  apple: { color: "#FA233B", name: "Apple Music", icon: FaApple },
  amazon: { color: "#FF9900", name: "Amazon Music", icon: FaAmazon },
  apple_music: { color: "#FA243C", name: "Apple Music", icon: FaApple },
  youtube_music: { color: "#FF0000", name: "YouTube Music", icon: YouTubeMusicIcon },
  amazon_music: { color: "#FF9900", name: "Amazon Music", icon: FaAmazon },
  yandex_music: { color: "#FFCC00", name: "Яндекс Музыка", icon: FaYandex },
  vk_music: { color: "#0077FF", name: "VK Музыка", icon: FaVk },
  custom: { color: "#8B5CF6", name: "Ссылка", icon: FaLink }
};

// Social platforms for contact info
const SOCIAL_PLATFORMS = {
  telegram: { name: "Telegram", icon: FaTelegram, color: "#229ED9", urlPrefix: "https://t.me/" },
  instagram: { name: "Instagram", icon: FaInstagram, color: "#E4405F", urlPrefix: "https://instagram.com/" },
  vk: { name: "VKontakte", icon: FaVk, color: "#4C75A3", urlPrefix: "https://vk.com/" },
  tiktok: { name: "TikTok", icon: FaTiktok, color: "#000000", urlPrefix: "https://tiktok.com/@" },
  twitter: { name: "X", icon: FaTwitter, color: "#1DA1F2", urlPrefix: "https://twitter.com/" },
  website: { name: "Сайт", icon: FaGlobe, color: "#6B7280", urlPrefix: "" },
};

// Helper to format social link URL
const formatSocialUrl = (platform, value) => {
  if (!value) return null;
  
  // If already a URL, return as is
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  
  const platformInfo = SOCIAL_PLATFORMS[platform];
  if (!platformInfo) return value;
  
  // Remove @ if present
  const cleanValue = value.startsWith("@") ? value.substring(1) : value;
  
  if (platform === "website") {
    return `https://${cleanValue}`;
  }
  
  return `${platformInfo.urlPrefix}${cleanValue}`;
};

export default function SubdomainPage() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [subdomain, setSubdomain] = useState("");

  useEffect(() => {
    // Get subdomain from hostname
    const host = window.location.hostname.toLowerCase();
    const mainDomain = 'mytrack.cc';
    let sub = "";
    
    if (host.endsWith(`.${mainDomain}`)) {
      sub = host.replace(`.${mainDomain}`, "");
    } else {
      // For development - check URL params
      const params = new URLSearchParams(window.location.search);
      sub = params.get('subdomain') || "";
    }
    
    setSubdomain(sub);
    
    if (sub) {
      fetchData(sub, slug);
    } else {
      setError("Поддомен не найден");
      setLoading(false);
    }
  }, [slug]);

  const fetchData = async (sub, pageSlug) => {
    try {
      const endpoint = pageSlug 
        ? `/subdomain-page?slug=${pageSlug}`
        : '/subdomain-page';
      
      const response = await api.get(endpoint, {
        headers: { 'X-Subdomain': sub }
      });
      
      setData(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError("Страница не найдена");
      } else if (err.response?.status === 410) {
        setError("Домен неактивен");
      } else {
        setError("Ошибка загрузки");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="text-center">
          <Globe className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
          <h1 className="text-2xl font-bold mb-2">{error}</h1>
          <p className="text-muted-foreground mb-6">
            {subdomain ? `${subdomain}.mytrack.cc` : "Неизвестный домен"}
          </p>
          <a href="https://mytrack.cc" className="text-primary hover:underline">
            Перейти на главную →
          </a>
        </div>
      </div>
    );
  }

  // If we have a page (slug provided), show the page
  if (data?.links) {
    return <PageView page={data} subdomain={subdomain} />;
  }

  // Otherwise show pages list for this subdomain
  return <PagesListView data={data} subdomain={subdomain} />;
}

// Component to display a single page
function PageView({ page, subdomain }) {
  const API_URL = process.env.REACT_APP_BACKEND_URL;
  
  const getImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith('/') ? `${API_URL}${url}` : url;
  };

  const handleLinkClick = (link) => {
    window.open(`${API_URL}/api/click/${link.id}`, '_blank');
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      {page.cover_image && (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${getImageUrl(page.blurred_background || page.cover_image)})`,
            filter: 'blur(50px) brightness(0.3)',
            transform: 'scale(1.1)'
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Subdomain badge */}
          <div className="text-center mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs text-zinc-300">
              <Globe className="w-3 h-3" />
              {subdomain}.mytrack.cc
            </span>
          </div>

          {/* Cover */}
          <div className="relative mb-6">
            <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl bg-zinc-800">
              {page.cover_image ? (
                <img 
                  src={getImageUrl(page.cover_image)} 
                  alt={page.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-20 h-20 text-zinc-600" />
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold">{page.artist_name}</h1>
              {page.user_verified && (
                <BadgeCheck className="w-5 h-5 text-primary" />
              )}
            </div>
            <p className="text-zinc-400">{page.release_title}</p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            {page.links?.map((link, idx) => {
              const platform = PLATFORMS[link.platform] || PLATFORMS.custom;
              return (
                <motion.button
                  key={link.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleLinkClick(link)}
                  className="w-full p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all flex items-center gap-3"
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: platform.color }}
                  >
                    <ExternalLink className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium flex-1 text-left">
                    {link.title || platform.name}
                  </span>
                  <ArrowRight className="w-4 h-4 text-zinc-400" />
                </motion.button>
              );
            })}
          </div>

          {/* Branding */}
          {!page.can_remove_branding && (
            <div className="text-center mt-8">
              <a 
                href="https://mytrack.cc" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
              >
                Создано на MyTrack
              </a>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// Component to display pages list
function PagesListView({ data, subdomain }) {
  const API_URL = process.env.REACT_APP_BACKEND_URL;
  
  const getImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith('/') ? `${API_URL}${url}` : url;
  };

  const hasContacts = data.contact_email || (data.social_links && Object.values(data.social_links).some(v => v));

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <span className="text-2xl font-bold text-white">
              {(data.artist_name || data.username)?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="text-2xl font-bold">{data.artist_name || data.username}</h1>
            {data.verified && (
              <BadgeCheck className="w-5 h-5 text-primary" />
            )}
          </div>
          {data.profile_description ? (
            <p className="text-zinc-400 text-sm max-w-md mx-auto">
              {data.profile_description}
            </p>
          ) : (
            <p className="text-zinc-500 text-sm">
              <Globe className="w-4 h-4 inline mr-1" />
              {subdomain}.mytrack.cc
            </p>
          )}
        </motion.div>

        {/* Pages Grid */}
        {data.pages?.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {data.pages.map((page, idx) => (
              <motion.div
                key={page.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link
                  to={`/${page.slug}`}
                  className="block group"
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-zinc-800 mb-2 group-hover:ring-2 ring-primary transition-all">
                    {page.cover_image ? (
                      <img 
                        src={getImageUrl(page.cover_image)} 
                        alt={page.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-10 h-10 text-zinc-600" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium text-sm truncate">{page.release_title || page.title}</h3>
                  <p className="text-xs text-zinc-500 truncate">{page.artist_name}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Music className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
            <p className="text-zinc-500">Нет опубликованных релизов</p>
          </div>
        )}

        {/* Contact Info Footer */}
        {hasContacts && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12 pt-8 border-t border-white/10"
          >
            <p className="text-xs text-zinc-500 mb-4 text-center">Связаться</p>
            
            {/* Contact Email */}
            {data.contact_email && (
              <a 
                href={`mailto:${data.contact_email}`}
                className="flex items-center justify-center gap-2 mb-4 px-4 py-3 bg-zinc-800/50 hover:bg-zinc-700/50 border border-white/10 rounded-xl transition-all group max-w-sm mx-auto"
              >
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-sm text-zinc-300 group-hover:text-white">{data.contact_email}</span>
              </a>
            )}
            
            {/* Social Links */}
            {data.social_links && Object.values(data.social_links).some(v => v) && (
              <div className="flex flex-wrap justify-center gap-3">
                {Object.entries(data.social_links).map(([platform, value]) => {
                  if (!value) return null;
                  
                  const platformInfo = SOCIAL_PLATFORMS[platform];
                  if (!platformInfo) return null;
                  
                  const Icon = platformInfo.icon;
                  const url = formatSocialUrl(platform, value);
                  
                  return (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                      style={{ backgroundColor: `${platformInfo.color}20` }}
                      title={platformInfo.name}
                    >
                      <Icon className="w-5 h-5" style={{ color: platformInfo.color }} />
                    </a>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Branding Footer */}
        <div className="text-center mt-12">
          <a 
            href="https://mytrack.cc" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
          >
            Создано на MyTrack
          </a>
        </div>
      </div>
    </div>
  );
}
