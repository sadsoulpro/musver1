import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { api } from "@/App";
import { toast } from "sonner";
import { 
  Music, ArrowLeft, Upload, Plus, Trash2, 
  GripVertical, ExternalLink, Save, ChevronUp, ChevronDown,
  QrCode, Download, Search, Loader2, Sun, Moon
} from "lucide-react";
import { FaSpotify, FaApple, FaYoutube, FaAmazon, FaItunes, FaGoogle, FaNapster, FaBandcamp } from "react-icons/fa";
import { SiTidal, SiPandora, SiAudiomack } from "react-icons/si";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { useLanguage } from "@/contexts/LanguageContext";

// Custom SVG icon components using uploaded SVG files
const SoundCloudIcon = (props) => (
  <img src="/icons/sc-mus.svg" alt="SoundCloud" {...props} style={{ width: props.width || '1em', height: props.height || '1em', ...props.style }} />
);

const TikTokIcon = (props) => (
  <img src="/icons/tik-tok.svg" alt="TikTok" {...props} style={{ width: props.width || '1em', height: props.height || '1em', ...props.style }} />
);

const VKMusicIcon = (props) => (
  <img src="/icons/vk-mus.svg" alt="VK Музыка" {...props} style={{ width: props.width || '1em', height: props.height || '1em', ...props.style }} />
);

const YandexMusicIcon = (props) => (
  <img src="/icons/yandex-mus.svg" alt="Яндекс Музыка" {...props} style={{ width: props.width || '1em', height: props.height || '1em', ...props.style }} />
);

const CustomLinkIcon = (props) => (
  <img src="/icons/link.svg" alt="Ссылка" {...props} style={{ width: props.width || '1em', height: props.height || '1em', ...props.style }} />
);

// YouTube Music icon using uploaded SVG
const YouTubeMusicIcon = (props) => (
  <img src="/icons/youtube-music.svg" alt="YouTube Music" {...props} style={{ width: props.width || '1em', height: props.height || '1em', ...props.style }} />
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

// Fallback Deezer icon if SiDeezer is not available
const DeezerIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M6.01 11.75H0V15h6.01v-3.25zM6.01 7.25H0v3.25h6.01V7.25zM6.01 16.25H0v3.25h6.01v-3.25zM12.005 11.75H6.01V15h5.995v-3.25zM12.005 16.25H6.01v3.25h5.995v-3.25zM17.995 11.75H12V15h5.995v-3.25zM17.995 16.25H12v3.25h5.995v-3.25zM17.995 7.25H12v3.25h5.995V7.25zM24 11.75h-6.005V15H24v-3.25zM24 16.25h-6.005v3.25H24v-3.25zM24 7.25h-6.005v3.25H24V7.25zM24 2.75h-6.005V6H24V2.75z"/>
  </svg>
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

// Platform order for auto-fill sorting (lower index = higher priority)
const PLATFORM_ORDER = [
  "spotify",       // 1. Spotify
  "appleMusic",    // 2. Apple Music
  "itunes",        // 3. iTunes
  "youtube",       // 4. YouTube
  "youtubeMusic",  // 5. YouTube Music
  "yandex",        // 6. Яндекс Музыка
  "vk",            // 7. VK Music
  "tiktok",        // 8. TikTok
  "deezer",        // 9. Deezer
  "tidal",         // 10. Tidal
  "amazonMusic",   // 11. Amazon Music
  "amazonStore",   // 12. Amazon Store
  "soundcloud",    // 13. SoundCloud
  "pandora",       // 14. Pandora
  "napster",       // 15. Napster
  "audiomack",     // 16. Audiomack
  "audius",        // 17. Audius
  "anghami",       // 18. Anghami
  "boomplay",      // 19. Boomplay
  "spinrilla",     // 20. Spinrilla
  "bandcamp",      // 21. Bandcamp
  "google",        // 22. Google
  "googleStore",   // 23. Google Store
  "zvuk",          // 24. Звук
  "mts",           // 25. МТС Музыка
  "custom",        // 26. Custom
];

// Auto-detect platform from URL
const detectPlatformFromUrl = (url) => {
  if (!url) return null;
  const urlLower = url.toLowerCase();
  
  // Special case: Check for iTunes parameter in Apple Music URLs
  if (urlLower.includes("music.apple.com") && urlLower.includes("app=itunes")) {
    return "itunes";
  }
  
  const patterns = [
    { platform: "spotify", patterns: ["open.spotify.com", "spotify.com"] },
    { platform: "appleMusic", patterns: ["music.apple.com"] },
    { platform: "itunes", patterns: ["itunes.apple.com"] },
    { platform: "youtube", patterns: ["youtube.com/watch", "youtu.be"] },
    { platform: "youtubeMusic", patterns: ["music.youtube.com"] },
    // Yandex Music - support all regional domains (ru, kz, by, uz, etc.)
    { platform: "yandex", patterns: ["music.yandex."] },
    { platform: "vk", patterns: ["vk.com/music", "vk.com/audio", "boom.ru"] },
    { platform: "tiktok", patterns: ["tiktok.com", "vm.tiktok.com"] },
    { platform: "deezer", patterns: ["deezer.com", "deezer.page.link"] },
    { platform: "tidal", patterns: ["tidal.com", "listen.tidal.com"] },
    { platform: "amazonMusic", patterns: ["music.amazon", "amazon.com/music"] },
    { platform: "soundcloud", patterns: ["soundcloud.com"] },
    { platform: "pandora", patterns: ["pandora.com"] },
    { platform: "napster", patterns: ["napster.com"] },
    { platform: "audiomack", patterns: ["audiomack.com"] },
    { platform: "audius", patterns: ["audius.co"] },
    { platform: "anghami", patterns: ["anghami.com"] },
    { platform: "boomplay", patterns: ["boomplay.com"] },
    { platform: "spinrilla", patterns: ["spinrilla.com"] },
    { platform: "bandcamp", patterns: ["bandcamp.com"] },
    { platform: "zvuk", patterns: ["zvuk.com", "sber-zvuk.com"] },
    { platform: "mts", patterns: ["music.mts.ru"] },
  ];
  
  for (const { platform, patterns: urlPatterns } of patterns) {
    for (const pattern of urlPatterns) {
      if (urlLower.includes(pattern)) {
        return platform;
      }
    }
  }
  
  // If URL but no match, return custom
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return "custom";
  }
  
  return null;
};

// Platform definitions (without names - names come from translations)
const PLATFORMS = [
  { id: "spotify", icon: FaSpotify, color: "#1DB954" },
  { id: "appleMusic", icon: FaApple, color: "#FA233B" },
  { id: "itunes", icon: FaItunes, color: "#EA4CC0" },
  { id: "youtube", icon: FaYoutube, color: "#FF0000" },
  { id: "youtubeMusic", icon: YouTubeMusicIcon, color: "#FF0000" },
  { id: "yandex", icon: YandexMusicIcon, color: "#FFCC00", isImage: true },
  { id: "vk", icon: VKMusicIcon, color: "#4C75A3", isImage: true },
  { id: "tiktok", icon: TikTokIcon, color: "#000000", isImage: true },
  { id: "deezer", icon: DeezerIcon, color: "#A238FF" },
  { id: "tidal", icon: SiTidal, color: "#000000" },
  { id: "amazonMusic", icon: FaAmazon, color: "#FF9900" },
  { id: "amazonStore", icon: FaAmazon, color: "#FF9900" },
  { id: "soundcloud", icon: SoundCloudIcon, color: "#FF5500", isImage: true },
  { id: "pandora", icon: PandoraIcon, color: "#005483" },
  { id: "napster", icon: FaNapster, color: "#000000" },
  { id: "audiomack", icon: SiAudiomack, color: "#FFA200" },
  { id: "audius", icon: AudiusIcon, color: "#CC0FE0" },
  { id: "anghami", icon: AnghamiIcon, color: "#6C3694" },
  { id: "boomplay", icon: BoomplayIcon, color: "#E11B22" },
  { id: "spinrilla", icon: SpinrillaIcon, color: "#121212" },
  { id: "bandcamp", icon: FaBandcamp, color: "#629AA9" },
  { id: "google", icon: FaGoogle, color: "#4285F4" },
  { id: "googleStore", icon: GooglePlayIcon, color: "#34A853" },
  { id: "zvuk", icon: ZvukIcon, color: "#6B4EFF" },
  { id: "mts", icon: MtsIcon, color: "#E30611" },
  { id: "custom", icon: CustomLinkIcon, color: "#888888", isImage: true },
];

export default function PageBuilder() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isEditing = Boolean(pageId);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Generate random 5-character slug
  const generateRandomSlug = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    artist_name: "",
    release_title: "",
    description: "",
    cover_image: "",
  });
  
  const [links, setLinks] = useState([]);
  const [newLink, setNewLink] = useState({ platform: "spotify", url: "" });
  const [qrEnabled, setQrEnabled] = useState(true);
  const [pageTheme, setPageTheme] = useState("dark"); // Тема публичной страницы
  const [scanningSource, setScanningSource] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [autoSaving, setAutoSaving] = useState(false);
  const [pageCreated, setPageCreated] = useState(false); // Track if page was created
  const [createdPageId, setCreatedPageId] = useState(null); // Store created page ID for new pages
  const [isTypingUrl, setIsTypingUrl] = useState(false); // Track if user is typing URL
  const qrRef = useRef(null);
  const formDataRef = useRef(formData);
  const pageThemeRef = useRef(pageTheme);
  const qrEnabledRef = useRef(qrEnabled);
  const linksRef = useRef(links);
  const scanInputTimeoutRef = useRef(null); // Debounce timeout for URL input

  // Keep refs in sync
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);
  
  useEffect(() => {
    pageThemeRef.current = pageTheme;
  }, [pageTheme]);
  
  useEffect(() => {
    qrEnabledRef.current = qrEnabled;
  }, [qrEnabled]);

  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scanInputTimeoutRef.current) {
        clearTimeout(scanInputTimeoutRef.current);
      }
    };
  }, []);

  // Instant auto-save function
  const instantSave = async (overrideData = {}) => {
    // For new pages, create it first if not created yet
    if (!isEditing && !pageCreated) {
      return createPageFirst(overrideData);
    }
    
    // Use pageId for editing, or createdPageId for newly created pages
    const targetPageId = pageId || createdPageId;
    if (!targetPageId) return;
    
    const currentFormData = { ...formDataRef.current, ...overrideData };
    
    setAutoSaving(true);
    try {
      let finalSlug = currentFormData.slug?.trim();
      if (!finalSlug) {
        finalSlug = generateRandomSlug();
      }
      
      let finalTitle = currentFormData.title?.trim();
      if (!finalTitle) {
        const parts = [currentFormData.artist_name, currentFormData.release_title].filter(Boolean);
        finalTitle = parts.length > 0 ? parts.join(" - ") : t('pageBuilder', 'newPage');
      }
      
      const pageData = { 
        ...currentFormData, 
        slug: finalSlug,
        title: finalTitle,
        qr_enabled: qrEnabledRef.current,
        page_theme: pageThemeRef.current
      };
      
      await api.put(`/pages/${targetPageId}`, pageData);
      toast.success(t('pageBuilder', 'autoSaved'), { duration: 1500 });
    } catch (error) {
      console.error('Auto-save failed:', error);
      toast.error(t('errors', 'saveFailed'), { duration: 2000 });
    } finally {
      setAutoSaving(false);
    }
  };

  // Create page first for new pages (returns page ID, NO navigation - stays on same page)
  const createPageFirst = async (overrideData = {}, linksToAdd = []) => {
    if (pageCreated) return createdPageId;
    
    const currentFormData = { ...formDataRef.current, ...overrideData };
    
    setAutoSaving(true);
    try {
      let finalSlug = currentFormData.slug?.trim();
      if (!finalSlug) {
        finalSlug = generateRandomSlug();
      }
      
      let finalTitle = currentFormData.title?.trim();
      if (!finalTitle) {
        const parts = [currentFormData.artist_name, currentFormData.release_title].filter(Boolean);
        finalTitle = parts.length > 0 ? parts.join(" - ") : t('pageBuilder', 'newPage');
      }
      
      const pageData = { 
        ...currentFormData, 
        slug: finalSlug,
        title: finalTitle,
        qr_enabled: qrEnabledRef.current,
        page_theme: pageThemeRef.current
      };
      
      const response = await api.post("/pages", pageData);
      const newPageId = response.data.id;
      
      // Add links to the created page
      const createdLinks = [];
      if (linksToAdd.length > 0) {
        for (const linkData of linksToAdd) {
          try {
            const linkResponse = await api.post(`/pages/${newPageId}/links`, {
              platform: linkData.platform,
              url: linkData.url,
              active: true
            });
            createdLinks.push(linkResponse.data);
          } catch (error) {
            console.error(`Failed to add ${linkData.platform} link to new page`);
          }
        }
      }
      
      // Update links state with server-created links (with real IDs)
      if (createdLinks.length > 0) {
        setLinks(createdLinks);
      }
      
      setPageCreated(true);
      setCreatedPageId(newPageId);
      
      // Update form data with final values
      setFormData(prev => ({
        ...prev,
        slug: finalSlug,
        title: finalTitle
      }));
      
      toast.success(t('pageBuilder', 'pageCreated'), { duration: 1500 });
      
      // NO navigation - stay on the same page, user can click "View Page" button
      
      return newPageId;
    } catch (error) {
      console.error('Create page failed:', error);
      if (error.response?.data?.detail === "PAGE_LIMIT_REACHED") {
        toast.error(t('errors', 'pageLimitReached'));
      } else {
        toast.error(t('errors', 'saveFailed'), { duration: 2000 });
      }
      return null;
    } finally {
      setAutoSaving(false);
    }
  };

  // Delete page function
  const deletePage = async () => {
    if (!pageId) return;
    
    if (!window.confirm(t('pageBuilder', 'confirmDelete'))) {
      return;
    }
    
    try {
      await api.delete(`/pages/${pageId}`);
      toast.success(t('pageBuilder', 'pageDeleted'));
      navigate('/multilinks');
    } catch (error) {
      console.error('Delete page failed:', error);
      toast.error(t('errors', 'deleteFailed'));
    }
  };

  useEffect(() => {
    if (isEditing) {
      fetchPage();
    }
  }, [pageId]);

  const fetchPage = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/pages/${pageId}`);
      setFormData({
        title: response.data.title,
        slug: response.data.slug,
        artist_name: response.data.artist_name,
        release_title: response.data.release_title,
        description: response.data.description || "",
        cover_image: response.data.cover_image || "",
      });
      setLinks(response.data.links || []);
      setQrEnabled(response.data.qr_enabled !== false);
      setPageTheme(response.data.page_theme || "dark");
    } catch (error) {
      toast.error(t('errors', 'loadFailed'));
      navigate("/multilinks");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-generate title and slug from artist_name and release_title
      if (name === "artist_name" || name === "release_title") {
        const artist = name === "artist_name" ? value : prev.artist_name;
        const release = name === "release_title" ? value : prev.release_title;
        
        if (artist || release) {
          const title = [artist, release].filter(Boolean).join(" - ");
          const slug = title.toLowerCase()
            .replace(/[^a-z0-9а-яё]+/gi, "-")
            .replace(/(^-|-$)/g, "")
            .substring(0, 50);
          updated.title = title;
          updated.slug = slug;
        }
      }
      
      return updated;
    });
    
    // Instant save after change (debounced slightly to avoid too many requests)
    if (isEditing) {
      setTimeout(() => instantSave(), 500);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);
    
    try {
      const response = await api.post("/upload", formDataUpload, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const newCoverImage = response.data.cover_url;
      setFormData(prev => ({ ...prev, cover_image: newCoverImage }));
      toast.success(t('common', 'success'));
      
      // Instant save after upload
      if (isEditing) {
        setTimeout(() => instantSave({ cover_image: newCoverImage }), 300);
      }
    } catch (error) {
      toast.error(t('errors', 'uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Generate random slug if not provided
      let finalSlug = formData.slug?.trim();
      if (!finalSlug) {
        finalSlug = generateRandomSlug();
      }
      
      // Generate title if not provided
      let finalTitle = formData.title?.trim();
      if (!finalTitle) {
        const parts = [formData.artist_name, formData.release_title].filter(Boolean);
        finalTitle = parts.length > 0 ? parts.join(" - ") : t('pageBuilder', 'newPage');
      }
      
      const pageData = { 
        ...formData, 
        slug: finalSlug,
        title: finalTitle,
        qr_enabled: qrEnabled,
        page_theme: pageTheme
      };
      
      if (isEditing) {
        await api.put(`/pages/${pageId}`, pageData);
        toast.success(t('pageBuilder', 'pageUpdated'));
      } else {
        const response = await api.post("/pages", pageData);
        // Add links if any
        for (const link of links) {
          await api.post(`/pages/${response.data.id}/links`, {
            platform: link.platform,
            url: link.url,
            active: link.active ?? true
          });
        }
        toast.success(t('pageBuilder', 'pageCreated'));
        navigate(`/page/${response.data.id}/edit`);
        return;
      }
    } catch (error) {
      const errorDetail = error.response?.data?.detail;
      if (errorDetail === "PAGE_LIMIT_REACHED") {
        toast.error(t('proModal', 'limitReached'));
      } else {
        toast.error(typeof errorDetail === "string" ? errorDetail : t('errors', 'saveFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  const addLink = async () => {
    if (!newLink.url) {
      toast.error(t('pageBuilder', 'enterUrl'));
      return;
    }
    
    if (isEditing) {
      try {
        const response = await api.post(`/pages/${pageId}/links`, {
          platform: newLink.platform,
          url: newLink.url,
          active: true
        });
        setLinks(prev => [...prev, response.data]);
        setNewLink({ platform: "spotify", url: "" });
        toast.success(t('pageBuilder', 'linkAdded'));
        // Instant save after adding link
        instantSave();
      } catch (error) {
        toast.error(t('errors', 'generic'));
      }
    } else {
      setLinks(prev => [...prev, { 
        id: Date.now().toString(),
        platform: newLink.platform, 
        url: newLink.url,
        active: true,
        clicks: 0
      }]);
      setNewLink({ platform: "spotify", url: "" });
    }
  };

  const toggleLink = async (linkId, active) => {
    if (isEditing) {
      try {
        await api.put(`/pages/${pageId}/links/${linkId}`, { active: !active });
        setLinks(prev => prev.map(l => l.id === linkId ? { ...l, active: !active } : l));
        // Instant save after toggle
        toast.success(t('pageBuilder', 'autoSaved'), { duration: 1500 });
      } catch (error) {
        toast.error(t('errors', 'generic'));
      }
    } else {
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, active: !active } : l));
    }
  };

  const deleteLink = async (linkId) => {
    if (isEditing) {
      try {
        await api.delete(`/pages/${pageId}/links/${linkId}`);
        setLinks(prev => prev.filter(l => l.id !== linkId));
        toast.success(t('pageBuilder', 'linkDeleted'));
      } catch (error) {
        toast.error(t('errors', 'deleteFailed'));
      }
    } else {
      setLinks(prev => prev.filter(l => l.id !== linkId));
    }
  };

  const moveLink = async (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= links.length) return;
    
    const newLinks = [...links];
    const [movedLink] = newLinks.splice(index, 1);
    newLinks.splice(newIndex, 0, movedLink);
    
    setLinks(newLinks);
    
    if (isEditing) {
      try {
        const linkIds = newLinks.map(l => l.id);
        await api.put(`/pages/${pageId}/links/reorder`, { link_ids: linkIds });
      } catch (error) {
        toast.error(t('errors', 'saveFailed'));
        // Revert on error
        setLinks(links);
      }
    }
  };

  // Scan source to auto-detect platform links via Odesli API
  const scanSource = async () => {
    if (!scanInput.trim()) {
      toast.error(t('pageBuilder', 'autofillHint'));
      return;
    }

    setScanningSource(true);
    
    try {
      const sourceInput = scanInput.trim();
      
      // Check if input is a UPC code (numeric, 10-14 digits)
      const isUpcCode = /^\d{10,14}$/.test(sourceInput);
      
      // Detect input type - Odesli supports many platforms
      const supportedPatterns = [
        "music.apple.com", "itunes.apple.com",
        "open.spotify.com", "spotify.com",
        "youtube.com", "youtu.be", "music.youtube.com",
        "deezer.com", "deezer.page.link",
        "tidal.com", "listen.tidal.com",
        "soundcloud.com",
        "amazon.com/music", "music.amazon",
        "pandora.com",
        "napster.com",
        "audiomack.com",
        "audius.co",
        "anghami.com",
        "boomplay.com",
        "spinrilla.com",
        "bandcamp.com",
        "song.link", "album.link", "odesli.co"
      ];
      
      const isValidUrl = supportedPatterns.some(pattern => sourceInput.includes(pattern));
      
      if (!isValidUrl && !isUpcCode) {
        toast.error(t('pageBuilder', 'autofillHint'));
        setScanningSource(false);
        return;
      }

      // Call Odesli API via backend proxy
      toast.info(isUpcCode ? t('pageBuilder', 'searchingUPC') : t('pageBuilder', 'searchingLinks'));
      
      const odesliResponse = await api.get(`/lookup/odesli?url=${encodeURIComponent(sourceInput)}`);
      const odesliData = odesliResponse.data;
      
      if (odesliData.error && Object.keys(odesliData.links || {}).length === 0) {
        toast.error(isUpcCode ? t('pageBuilder', 'upcNotFound') : t('pageBuilder', 'trackNotFound'));
        setScanningSource(false);
        return;
      }

      const platformLinks = odesliData.links || {};
      const detectedLinks = [];
      let linksAdded = 0;

      // Update cover image if available
      let updatedFormData = { ...formData };
      if (odesliData.thumbnailUrl) {
        updatedFormData.cover_image = odesliData.thumbnailUrl;
        setFormData(prev => ({ ...prev, cover_image: odesliData.thumbnailUrl }));
      }

      // Update artist and release title if available and empty
      if (odesliData.artistName && !formData.artist_name) {
        updatedFormData.artist_name = odesliData.artistName;
        setFormData(prev => ({ ...prev, artist_name: odesliData.artistName }));
      }
      if (odesliData.title && !formData.release_title) {
        updatedFormData.release_title = odesliData.title;
        setFormData(prev => ({ ...prev, release_title: odesliData.title }));
      }
      
      // Auto-generate title and slug if updated
      if (updatedFormData.artist_name || updatedFormData.release_title) {
        const artist = updatedFormData.artist_name || '';
        const release = updatedFormData.release_title || '';
        if (artist || release) {
          const title = [artist, release].filter(Boolean).join(" - ");
          const slug = title.toLowerCase()
            .replace(/[^a-z0-9а-яё]+/gi, "-")
            .replace(/(^-|-$)/g, "")
            .substring(0, 50);
          if (!formData.title) updatedFormData.title = title;
          if (!formData.slug) updatedFormData.slug = slug;
          setFormData(prev => ({ 
            ...prev, 
            title: prev.title || title,
            slug: prev.slug || slug 
          }));
        }
      }

      // Add all platform links from Odesli
      for (const [platform, url] of Object.entries(platformLinks)) {
        const existing = links.find(l => l.platform === platform);
        if (!existing && url) {
          detectedLinks.push({ platform, url });
        }
      }

      if (detectedLinks.length === 0) {
        toast.info(t('pageBuilder', 'allLinksAdded'));
        setScanningSource(false);
        return;
      }

      // Sort detected links according to PLATFORM_ORDER
      detectedLinks.sort((a, b) => {
        const orderA = PLATFORM_ORDER.indexOf(a.platform);
        const orderB = PLATFORM_ORDER.indexOf(b.platform);
        const posA = orderA === -1 ? 999 : orderA;
        const posB = orderB === -1 ? 999 : orderB;
        return posA - posB;
      });

      // Collect all new links first
      const newLinks = [];
      
      // Add detected links
      for (const linkData of detectedLinks) {
        if (isEditing) {
          try {
            const response = await api.post(`/pages/${pageId}/links`, {
              platform: linkData.platform,
              url: linkData.url,
              active: true
            });
            newLinks.push(response.data);
            linksAdded++;
          } catch (error) {
            console.error(`Failed to add ${linkData.platform} link`);
          }
        } else {
          newLinks.push({
            id: Date.now().toString() + linkData.platform,
            platform: linkData.platform,
            url: linkData.url,
            active: true,
            clicks: 0
          });
          linksAdded++;
        }
      }

      // Combine existing links with new links and sort all by PLATFORM_ORDER
      const allLinks = [...links, ...newLinks];
      allLinks.sort((a, b) => {
        const orderA = PLATFORM_ORDER.indexOf(a.platform);
        const orderB = PLATFORM_ORDER.indexOf(b.platform);
        const posA = orderA === -1 ? 999 : orderA;
        const posB = orderB === -1 ? 999 : orderB;
        return posA - posB;
      });
      
      setLinks(allLinks);

      // If editing, update the order on backend
      if (isEditing && allLinks.length > 0) {
        try {
          const linkIds = allLinks.map(l => l.id);
          await api.put(`/pages/${pageId}/links/reorder`, { link_ids: linkIds });
        } catch (error) {
          console.error("Failed to reorder links");
        }
      }

      const platformNames = detectedLinks.slice(0, 5).map(l => 
        t('platforms', l.platform) || l.platform
      ).join(", ");
      
      const moreCount = detectedLinks.length > 5 ? ` +${detectedLinks.length - 5}` : "";
      toast.success(`${t('pageBuilder', 'linksAdded')}: ${linksAdded} (${platformNames}${moreCount})`);
      setScanInput("");
      
      // Wait 2 seconds for links to be fully added, then save
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Save after delay - NO navigation, stay on same page
      if (isEditing) {
        await instantSave(updatedFormData);
        toast.success(t('pageBuilder', 'autoSaved'), { duration: 1500 });
      } else {
        // For new pages, create page with all data AND links - NO redirect
        await createPageFirst(updatedFormData, detectedLinks);
      }
    } catch (error) {
      console.error("Scan error:", error);
      toast.error(t('pageBuilder', 'scanError'));
    } finally {
      setScanningSource(false);
    }
  };

  // Download QR code as PNG
  const downloadQRCode = () => {
    if (!qrRef.current) return;
    
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    canvas.width = 512;
    canvas.height = 512;
    
    img.onload = () => {
      ctx.fillStyle = "#18181b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const link = document.createElement("a");
      link.download = `${formData.slug || "qrcode"}-muslink.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(data)));
  };

  const getPublicUrl = () => {
    return `${window.location.origin}/${formData.slug}`;
  };

  const getPlatformInfo = (platformId) => {
    const platform = PLATFORMS.find(p => p.id === platformId) || PLATFORMS[PLATFORMS.length - 1];
    return {
      ...platform,
      name: t('platforms', platform.id) || platform.id
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link to="/multilinks">
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-semibold text-sm sm:text-base truncate">{isEditing ? t('pageBuilder', 'editing') : t('pageBuilder', 'newPage')}</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {(isEditing || pageCreated) && formData.slug && (
              <a href={`/${formData.slug}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="rounded-full" data-testid="view-public-page-btn">
                  <ExternalLink className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('pageBuilder', 'viewPage')}</span>
                </Button>
              </a>
            )}
            <Button 
              onClick={handleSubmit}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 rounded-full text-sm"
              data-testid="save-page-btn"
            >
              <Save className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{saving ? t('pageBuilder', 'saving') : t('common', 'save')}</span>
            </Button>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto p-4 sm:p-6 grid lg:grid-cols-2 gap-6 lg:gap-10 overflow-hidden">
        {/* Form */}
        <div className="space-y-6 sm:space-y-8">
          
          {/* 1. Автозаполнение через Odesli - ПЕРВЫМ */}
          <section className="overflow-hidden">
            <div className="p-3 sm:p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <Search className="w-4 h-4 text-primary" />
                <span className="text-xs sm:text-sm font-medium">{t('pageBuilder', 'autofill')}</span>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">
                {t('pageBuilder', 'autofillDesc')}
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder={t('pageBuilder', 'autofillPlaceholder')}
                  value={scanInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setScanInput(value);
                    setIsTypingUrl(true);
                    
                    // Clear previous timeout
                    if (scanInputTimeoutRef.current) {
                      clearTimeout(scanInputTimeoutRef.current);
                    }
                    
                    // Set new timeout - wait for user to stop typing (1 second)
                    scanInputTimeoutRef.current = setTimeout(() => {
                      setIsTypingUrl(false);
                    }, 1000);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !scanningSource && !isTypingUrl && scanInput.trim()) {
                      e.preventDefault();
                      scanSource();
                    }
                  }}
                  data-testid="scan-source-input"
                  className="h-9 sm:h-10 bg-muted border-zinc-700 flex-1 text-xs sm:text-sm"
                />
                <Button 
                  onClick={scanSource}
                  disabled={scanningSource || isTypingUrl || !scanInput.trim()}
                  className="h-9 sm:h-10 bg-primary hover:bg-primary/90 px-3"
                  data-testid="scan-source-btn"
                  title={isTypingUrl ? (t('pageBuilder', 'waitingForInput') || 'Ожидание окончания ввода...') : ''}
                >
                  {scanningSource ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isTypingUrl ? (
                    <Loader2 className="w-4 h-4 animate-spin opacity-50" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {isTypingUrl && scanInput.trim() && (
                <p className="text-[10px] text-muted-foreground mt-1 animate-pulse">
                  {t('pageBuilder', 'waitingForInput') || 'Ожидание окончания ввода...'}
                </p>
              )}
            </div>
          </section>
          
          {/* 2. Основная информация */}
          <section>
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t('pageBuilder', 'basicInfo')}</h2>
            <div className="space-y-3 sm:space-y-4">
              {/* Имя артиста */}
              <div className="space-y-2">
                <Label htmlFor="artist_name" className="text-sm">{t('pageBuilder', 'artistName')}</Label>
                <Input
                  id="artist_name"
                  name="artist_name"
                  placeholder={t('pageBuilder', 'artistPlaceholder')}
                  value={formData.artist_name}
                  onChange={handleChange}
                  required
                  data-testid="artist-name-input"
                  className="h-10 sm:h-12 bg-card border-zinc-800"
                />
              </div>
              
              {/* Название релиза */}
              <div className="space-y-2">
                <Label htmlFor="release_title" className="text-sm">{t('pageBuilder', 'releaseTitle')}</Label>
                <Input
                  id="release_title"
                  name="release_title"
                  placeholder={t('pageBuilder', 'releasePlaceholder')}
                  value={formData.release_title}
                  onChange={handleChange}
                  required
                  data-testid="release-title-input"
                  className="h-10 sm:h-12 bg-card border-zinc-800"
                />
              </div>
              
              {/* URL-адрес */}
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-sm">{t('pageBuilder', 'linkUrl')}</Label>
                <div className="flex items-center">
                  <span className="text-muted-foreground text-sm mr-2">/</span>
                  <Input
                    id="slug"
                    name="slug"
                    placeholder={t('pageBuilder', 'slugPlaceholder')}
                    value={formData.slug}
                    onChange={handleChange}
                    data-testid="page-slug-input"
                    className="h-10 sm:h-12 bg-card border-zinc-800"
                  />
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {t('pageBuilder', 'slugHint')}
                </p>
              </div>
              
              {/* Описание */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm">{t('pageBuilder', 'description')}</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder={t('pageBuilder', 'descPlaceholder')}
                  value={formData.description}
                  onChange={handleChange}
                  data-testid="description-input"
                  className="bg-card border-zinc-800 min-h-[80px] sm:min-h-[100px]"
                />
              </div>
            </div>
          </section>
          
          {/* 3. Обложка */}
          <section>
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t('pageBuilder', 'coverImage')}</h2>
            <div className="space-y-3 sm:space-y-4">
              <div 
                className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-muted overflow-hidden border-2 border-dashed border-zinc-700 hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => document.getElementById('cover-upload').click()}
              >
                {formData.cover_image ? (
                  <img 
                    src={formData.cover_image.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${formData.cover_image}` : formData.cover_image}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">{t('common', 'upload')}</span>
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary"></div>
                  </div>
                )}
              </div>
              <input
                id="cover-upload"
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
                data-testid="cover-upload-input"
              />
              <p className="text-xs text-muted-foreground">
                {t('pageBuilder', 'coverHint')}
              </p>
            </div>
          </section>
          
          {/* 3.5. Вид дизайна страницы */}
          <section>
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t('pageBuilder', 'pageDesign')}</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { 
                  setPageTheme("dark"); 
                  if (isEditing) setTimeout(() => instantSave({ page_theme: "dark" }), 100);
                }}
                className={`p-4 rounded-xl border-2 transition-all ${
                  pageTheme === "dark" 
                    ? "border-primary bg-primary/10" 
                    : "border-border bg-card hover:border-primary/50"
                }`}
                data-testid="theme-dark-btn"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center">
                    <Moon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium">{t('pageBuilder', 'darkTheme')}</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { 
                  setPageTheme("light"); 
                  if (isEditing) setTimeout(() => instantSave({ page_theme: "light" }), 100);
                }}
                className={`p-4 rounded-xl border-2 transition-all ${
                  pageTheme === "light" 
                    ? "border-primary bg-primary/10" 
                    : "border-border bg-card hover:border-primary/50"
                }`}
                data-testid="theme-light-btn"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Sun className="w-6 h-6 text-yellow-500" />
                  </div>
                  <span className="text-sm font-medium">{t('pageBuilder', 'lightTheme')}</span>
                </div>
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('pageBuilder', 'pageDesignHint')}
            </p>
          </section>
          
          {/* 4. Ссылки на платформы */}
          <section className="overflow-hidden">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t('pageBuilder', 'platformLinks')}</h2>
            
            {/* Add New Link */}
            <div className="flex flex-col sm:flex-row gap-2 mb-3 sm:mb-4">
              <select
                value={newLink.platform}
                onChange={(e) => setNewLink(prev => ({ ...prev, platform: e.target.value }))}
                className="h-10 sm:h-12 px-3 sm:px-4 rounded-xl bg-card border border-zinc-800 text-foreground text-sm"
                data-testid="platform-select"
              >
                {PLATFORMS.map(p => (
                  <option key={p.id} value={p.id}>{t('platforms', p.id)}</option>
                ))}
              </select>
              <div className="flex gap-2 flex-1">
                <Input
                  placeholder="https://..."
                  value={newLink.url}
                  onChange={(e) => {
                    const url = e.target.value;
                    setNewLink(prev => ({ ...prev, url }));
                    // Auto-detect platform from URL
                    const detectedPlatform = detectPlatformFromUrl(url);
                    if (detectedPlatform) {
                      setNewLink(prev => ({ ...prev, url, platform: detectedPlatform }));
                    }
                  }}
                  data-testid="link-url-input"
                  className="h-10 sm:h-12 bg-card border-zinc-800 flex-1"
                />
                <Button 
                  onClick={addLink}
                  className="h-10 sm:h-12 bg-primary hover:bg-primary/90 px-3 sm:px-4"
                  data-testid="add-link-btn"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Links List */}
            <div className="space-y-2 w-full page-builder-links">
              {links.map((link, i) => {
                const platform = getPlatformInfo(link.platform);
                const Icon = platform.icon;
                
                return (
                  <motion.div
                    key={link.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl panel-card w-full overflow-hidden"
                    data-testid={`link-item-${link.id}`}
                  >
                    {/* Move Up/Down Buttons */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        onClick={() => moveLink(i, -1)}
                        disabled={i === 0}
                        data-testid={`move-up-${link.id}`}
                      >
                        <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        onClick={() => moveLink(i, 1)}
                        disabled={i === links.length - 1}
                        data-testid={`move-down-${link.id}`}
                      >
                        <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                    <div 
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: platform.color }}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base">{platform.name}</p>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <Switch
                        checked={link.active}
                        onCheckedChange={() => toggleLink(link.id, link.active)}
                        data-testid={`toggle-link-${link.id}`}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => deleteLink(link.id)}
                        className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-red-400"
                        data-testid={`delete-link-${link.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
              
              {links.length === 0 && (
                <p className="text-center text-muted-foreground py-8 border border-dashed border-zinc-800 rounded-xl">
                  {t('pageBuilder', 'noLinks')}
                </p>
              )}
            </div>
          </section>
          
          {/* QR Code Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">{t('pageBuilder', 'qrCode')}</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {qrEnabled ? t('common', 'enabled') : t('common', 'disabled')}
                </span>
                <Switch
                  checked={qrEnabled}
                  onCheckedChange={(checked) => { 
                    setQrEnabled(checked); 
                    if (isEditing) setTimeout(() => instantSave({ qr_enabled: checked }), 100);
                  }}
                  data-testid="qr-toggle"
                />
              </div>
            </div>
            
            {qrEnabled && formData.slug && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-6 rounded-xl panel-card"
              >
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div 
                    ref={qrRef}
                    className="p-4 bg-white rounded-xl"
                  >
                    <QRCodeSVG
                      value={getPublicUrl()}
                      size={160}
                      level="H"
                      includeMargin={false}
                      bgColor="#ffffff"
                      fgColor="#18181b"
                    />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-sm text-muted-foreground mb-2">
                      {t('pageBuilder', 'qrDesc')}
                    </p>
                    <p className="text-xs text-zinc-500 mb-4 font-mono break-all">
                      {getPublicUrl()}
                    </p>
                    <Button
                      onClick={downloadQRCode}
                      variant="outline"
                      className="rounded-full"
                      data-testid="download-qr-btn"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t('pageBuilder', 'downloadPng')}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
            
            {qrEnabled && !formData.slug && (
              <p className="text-center text-muted-foreground py-6 border border-dashed border-zinc-800 rounded-xl">
                {t('pageBuilder', 'enterUrlForQr')}
              </p>
            )}
            
            {!qrEnabled && (
              <p className="text-center text-muted-foreground py-6 border border-dashed border-zinc-800 rounded-xl">
                {t('pageBuilder', 'qrDisabled')}
              </p>
            )}
          </section>
          
          {/* Delete Page Section */}
          {isEditing && (
            <section className="mt-8 pt-6 border-t border-red-500/20">
              <Button
                type="button"
                variant="destructive"
                onClick={deletePage}
                className="w-full rounded-xl"
                data-testid="delete-page-btn"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('pageBuilder', 'deletePage')}
              </Button>
            </section>
          )}
        </div>
        
        {/* Live Preview */}
        <div className="hidden lg:block sticky top-24 h-fit">
          <h2 className="text-lg font-semibold mb-4">{t('common', 'preview')}</h2>
          <div className="relative mx-auto w-[300px]">
            {/* Phone Frame */}
            <div className="rounded-[40px] border-4 border-border bg-card p-2 shadow-2xl">
              <div className="rounded-[32px] overflow-hidden aspect-[9/16] relative bg-zinc-900">
                {/* Background */}
                <div 
                  className="absolute inset-0 bg-gradient-to-b from-purple-900/30 to-zinc-900"
                  style={formData.cover_image ? {
                    backgroundImage: `url(${formData.cover_image.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${formData.cover_image}` : formData.cover_image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(40px)',
                    transform: 'scale(1.2)',
                    opacity: 0.4
                  } : {}}
                />
                
                {/* Content */}
                <div className="relative p-6 pt-10 flex flex-col items-center text-center h-full">
                  {/* Cover */}
                  <div className="w-24 h-24 rounded-xl bg-zinc-800 overflow-hidden mb-4 shadow-xl">
                    {formData.cover_image ? (
                      <img 
                        src={formData.cover_image.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${formData.cover_image}` : formData.cover_image}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-10 h-10 text-zinc-600" />
                      </div>
                    )}
                  </div>
                  
                  <h3 className="font-display text-lg uppercase text-white">
                    {formData.artist_name || t('pageBuilder', 'artistName')}
                  </h3>
                  <p className="text-sm text-zinc-400 mb-6">
                    {formData.release_title || t('pageBuilder', 'releaseTitle')}
                  </p>
                  
                  {/* Links Preview */}
                  <div className="w-full space-y-2 flex-1 overflow-auto">
                    {links.filter(l => l.active).map(link => {
                      const platform = getPlatformInfo(link.platform);
                      const Icon = platform.icon;
                      
                      return (
                        <div 
                          key={link.id}
                          className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3"
                        >
                          <Icon className="w-5 h-5" style={{ color: platform.color }} />
                          <span className="text-sm font-medium text-white">{platform.name}</span>
                        </div>
                      );
                    })}
                    
                    {links.filter(l => l.active).length === 0 && (
                      <div className="py-3 px-4 rounded-xl border border-dashed border-white/20 text-xs text-zinc-400">
                        {t('pageBuilder', 'linksWillAppear')}
                      </div>
                    )}
                  </div>
                  
                  {/* QR Code in Preview */}
                  {qrEnabled && formData.slug && (
                    <div className="mt-4 p-2 bg-white rounded-lg">
                      <QRCodeSVG
                        value={getPublicUrl()}
                        size={60}
                        level="L"
                        includeMargin={false}
                        bgColor="#ffffff"
                        fgColor="#18181b"
                      />
                    </div>
                  )}
                  
                  {/* Footer */}
                  <div className="mt-auto pt-4">
                    <p className="text-[10px] text-zinc-500">Powered by Mus.Link</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Glow */}
            <div className="absolute -inset-4 bg-primary/10 blur-3xl -z-10 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
