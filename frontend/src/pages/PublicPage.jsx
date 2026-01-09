import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Music, ExternalLink } from "lucide-react";
import { FaSpotify, FaApple, FaYoutube, FaSoundcloud, FaLink } from "react-icons/fa";
import { SiTidal } from "react-icons/si";
import { motion } from "framer-motion";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLATFORMS = {
  spotify: { name: "Spotify", icon: FaSpotify, color: "#1DB954", bgClass: "platform-spotify" },
  apple: { name: "Apple Music", icon: FaApple, color: "#FA233B", bgClass: "platform-apple" },
  youtube: { name: "YouTube", icon: FaYoutube, color: "#FF0000", bgClass: "platform-youtube" },
  soundcloud: { name: "SoundCloud", icon: FaSoundcloud, color: "#FF5500", bgClass: "platform-soundcloud" },
  tidal: { name: "Tidal", icon: SiTidal, color: "#000000", bgClass: "platform-tidal" },
  deezer: { name: "Deezer", icon: SiDeezer, color: "#00C7F2", bgClass: "platform-deezer" },
  custom: { name: "Listen Now", icon: FaLink, color: "#888888", bgClass: "" },
};

export default function PublicPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPage();
  }, [slug]);

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
            Powered by BandLink
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
}
