import { useState, useEffect, useRef } from "react";
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
  QrCode, Download, Search, Loader2
} from "lucide-react";
import { FaSpotify, FaApple, FaYoutube, FaSoundcloud, FaLink, FaYandex, FaVk, FaAmazon, FaItunes } from "react-icons/fa";
import { SiTidal } from "react-icons/si";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

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

// Platform order for auto-fill sorting (lower index = higher priority)
const PLATFORM_ORDER = [
  "yandex",    // 1. Яндекс Музыка
  "youtube",   // 2. YouTube
  "apple",     // 3. Apple Music
  "itunes",    // 4. iTunes
  "spotify",   // 5. Spotify
  "vk",        // 6. VK Music
  "deezer",    // 7. Deezer
  "zvuk",      // 8. Звук
  "mts",       // 9. МТС Музыка
  "amazon",    // 10. Amazon Music
  "tidal",     // 11. Tidal
  "soundcloud",// 12. SoundCloud
  "custom",    // 13. Custom
];

const PLATFORMS = [
  { id: "yandex", name: "Яндекс Музыка", icon: FaYandex, color: "#FFCC00" },
  { id: "youtube", name: "YouTube", icon: FaYoutube, color: "#FF0000" },
  { id: "apple", name: "Apple Music", icon: FaApple, color: "#FA233B" },
  { id: "itunes", name: "iTunes", icon: FaItunes, color: "#EA4CC0" },
  { id: "spotify", name: "Spotify", icon: FaSpotify, color: "#1DB954" },
  { id: "vk", name: "VK Музыка", icon: FaVk, color: "#4C75A3" },
  { id: "deezer", name: "Deezer", icon: DeezerIcon, color: "#A238FF" },
  { id: "zvuk", name: "Звук", icon: ZvukIcon, color: "#6B4EFF" },
  { id: "mts", name: "МТС Музыка", icon: MtsIcon, color: "#E30611" },
  { id: "amazon", name: "Amazon Music", icon: FaAmazon, color: "#FF9900" },
  { id: "tidal", name: "Tidal", icon: SiTidal, color: "#000000" },
  { id: "soundcloud", name: "SoundCloud", icon: FaSoundcloud, color: "#FF5500" },
  { id: "custom", name: "Другая ссылка", icon: FaLink, color: "#888888" },
];

export default function PageBuilder() {
  const { pageId } = useParams();
  const navigate = useNavigate();
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
  const [scanningSource, setScanningSource] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const qrRef = useRef(null);

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
    } catch (error) {
      toast.error("Не удалось загрузить страницу");
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
      if ((name === "artist_name" || name === "release_title") && !isEditing) {
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
      setFormData(prev => ({ ...prev, cover_image: response.data.cover_url }));
      toast.success("Изображение загружено");
    } catch (error) {
      toast.error("Не удалось загрузить изображение");
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
        finalTitle = parts.length > 0 ? parts.join(" - ") : "Новая страница";
      }
      
      const pageData = { 
        ...formData, 
        slug: finalSlug,
        title: finalTitle,
        qr_enabled: qrEnabled 
      };
      
      if (isEditing) {
        await api.put(`/pages/${pageId}`, pageData);
        toast.success("Страница обновлена");
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
        toast.success("Страница создана");
        navigate(`/page/${response.data.id}/edit`);
        return;
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Не удалось сохранить страницу");
    } finally {
      setSaving(false);
    }
  };

  const addLink = async () => {
    if (!newLink.url) {
      toast.error("Пожалуйста, введите URL");
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
        toast.success("Ссылка добавлена");
      } catch (error) {
        toast.error("Не удалось добавить ссылку");
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
      } catch (error) {
        toast.error("Не удалось обновить ссылку");
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
        toast.success("Ссылка удалена");
      } catch (error) {
        toast.error("Не удалось удалить ссылку");
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
        toast.error("Не удалось сохранить порядок");
        // Revert on error
        setLinks(links);
      }
    }
  };

  // Scan source to auto-detect platform links via Odesli API
  const scanSource = async () => {
    if (!scanInput.trim()) {
      toast.error("Введите ссылку Apple Music, Spotify, YouTube, Deezer, Tidal или SoundCloud");
      return;
    }

    setScanningSource(true);
    
    try {
      const sourceUrl = scanInput.trim();
      
      // Detect input type - Odesli supports many platforms
      const supportedPatterns = [
        "music.apple.com", "itunes.apple.com",
        "open.spotify.com", "spotify.com",
        "youtube.com", "youtu.be", "music.youtube.com",
        "deezer.com", "deezer.page.link",
        "tidal.com", "listen.tidal.com",
        "soundcloud.com",
        "amazon.com/music", "music.amazon",
        "song.link", "album.link", "odesli.co"
      ];
      
      const isValidUrl = supportedPatterns.some(pattern => sourceUrl.includes(pattern));
      
      if (!isValidUrl) {
        toast.error("Введите ссылку из Spotify, Apple Music, YouTube, Deezer, Tidal или SoundCloud");
        setScanningSource(false);
        return;
      }

      // Call Odesli API via backend proxy
      toast.info("Поиск ссылок на всех платформах...");
      
      const odesliResponse = await api.get(`/lookup/odesli?url=${encodeURIComponent(sourceUrl)}`);
      const odesliData = odesliResponse.data;
      
      if (odesliData.error && Object.keys(odesliData.links || {}).length === 0) {
        toast.error("Не удалось найти трек. Попробуйте другую ссылку.");
        setScanningSource(false);
        return;
      }

      const platformLinks = odesliData.links || {};
      const detectedLinks = [];
      let linksAdded = 0;

      // Update cover image if available
      if (odesliData.thumbnailUrl) {
        setFormData(prev => ({ ...prev, cover_image: odesliData.thumbnailUrl }));
      }

      // Update artist and release title if available and empty
      if (odesliData.artistName && !formData.artist_name) {
        setFormData(prev => ({ ...prev, artist_name: odesliData.artistName }));
      }
      if (odesliData.title && !formData.release_title) {
        setFormData(prev => ({ ...prev, release_title: odesliData.title }));
      }

      // Add all platform links from Odesli
      for (const [platform, url] of Object.entries(platformLinks)) {
        const existing = links.find(l => l.platform === platform);
        if (!existing && url) {
          detectedLinks.push({ platform, url });
        }
      }

      // Also add the source URL if it matches a platform we support
      const sourcePlatformMap = {
        "spotify": sourceUrl.includes("spotify.com"),
        "apple": sourceUrl.includes("music.apple.com"),
        "itunes": sourceUrl.includes("itunes.apple.com"),
        "youtube": sourceUrl.includes("youtube.com") || sourceUrl.includes("youtu.be"),
        "soundcloud": sourceUrl.includes("soundcloud.com"),
        "tidal": sourceUrl.includes("tidal.com"),
        "deezer": sourceUrl.includes("deezer.com") || sourceUrl.includes("deezer.page.link"),
        "amazon": sourceUrl.includes("amazon.com/music") || sourceUrl.includes("music.amazon"),
      };

      for (const [platform, matches] of Object.entries(sourcePlatformMap)) {
        if (matches) {
          const existing = links.find(l => l.platform === platform);
          const alreadyAdded = detectedLinks.find(l => l.platform === platform);
          if (!existing && !alreadyAdded) {
            detectedLinks.push({ platform, url: sourceUrl });
          }
        }
      }

      if (detectedLinks.length === 0) {
        toast.info("Все доступные ссылки уже добавлены");
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
        PLATFORMS.find(p => p.id === l.platform)?.name || l.platform
      ).join(", ");
      
      const moreCount = detectedLinks.length > 5 ? ` и ещё ${detectedLinks.length - 5}` : "";
      toast.success(`Добавлено ${linksAdded} ссылок: ${platformNames}${moreCount}`);
      setScanInput("");
    } catch (error) {
      console.error("Scan error:", error);
      toast.error("Не удалось получить ссылки. Проверьте URL и попробуйте снова.");
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
      link.download = `${formData.slug || "qrcode"}-mytrack.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(data)));
  };

  const getPublicUrl = () => {
    return `${window.location.origin}/${formData.slug}`;
  };

  const getPlatformInfo = (platformId) => {
    return PLATFORMS.find(p => p.id === platformId) || PLATFORMS[PLATFORMS.length - 1];
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
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link to="/multilinks">
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-semibold text-sm sm:text-base truncate">{isEditing ? "Редактирование" : "Новая страница"}</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {isEditing && formData.slug && (
              <a href={`/${formData.slug}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="rounded-full" data-testid="view-public-page-btn">
                  <ExternalLink className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Открыть страницу</span>
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
              <span className="hidden sm:inline">{saving ? "Сохранение..." : "Сохранить"}</span>
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
                <span className="text-xs sm:text-sm font-medium">Автозаполнение</span>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">
                Вставьте ссылку из Spotify, Apple Music, YouTube или другой платформы — данные заполнятся автоматически
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Вставьте ссылку..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  data-testid="scan-source-input"
                  className="h-9 sm:h-10 bg-zinc-800 border-zinc-700 flex-1 text-xs sm:text-sm"
                />
                <Button 
                  onClick={scanSource}
                  disabled={scanningSource}
                  className="h-9 sm:h-10 bg-primary hover:bg-primary/90 px-3"
                  data-testid="scan-source-btn"
                >
                  {scanningSource ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </section>
          
          {/* 2. Основная информация */}
          <section>
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Основная информация</h2>
            <div className="space-y-3 sm:space-y-4">
              {/* Имя артиста */}
              <div className="space-y-2">
                <Label htmlFor="artist_name" className="text-sm">Имя артиста</Label>
                <Input
                  id="artist_name"
                  name="artist_name"
                  placeholder="Ваше имя или псевдоним"
                  value={formData.artist_name}
                  onChange={handleChange}
                  required
                  data-testid="artist-name-input"
                  className="h-10 sm:h-12 bg-zinc-900 border-zinc-800"
                />
              </div>
              
              {/* Название релиза */}
              <div className="space-y-2">
                <Label htmlFor="release_title" className="text-sm">Название релиза</Label>
                <Input
                  id="release_title"
                  name="release_title"
                  placeholder="Название песни или альбома"
                  value={formData.release_title}
                  onChange={handleChange}
                  required
                  data-testid="release-title-input"
                  className="h-10 sm:h-12 bg-zinc-900 border-zinc-800"
                />
              </div>
              
              {/* URL-адрес */}
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-sm">Вид ссылки</Label>
                <div className="flex items-center">
                  <span className="text-muted-foreground text-sm mr-2">/</span>
                  <Input
                    id="slug"
                    name="slug"
                    placeholder="оставьте пустым для автогенерации"
                    value={formData.slug}
                    onChange={handleChange}
                    data-testid="page-slug-input"
                    className="h-10 sm:h-12 bg-zinc-900 border-zinc-800"
                  />
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Генерируется автоматически, если не указан
                </p>
              </div>
              
              {/* Описание */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm">Описание (необязательно)</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Расскажите о релизе..."
                  value={formData.description}
                  onChange={handleChange}
                  data-testid="description-input"
                  className="bg-zinc-900 border-zinc-800 min-h-[80px] sm:min-h-[100px]"
                />
              </div>
            </div>
          </section>
          
          {/* 3. Обложка */}
          <section>
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Обложка</h2>
            <div className="space-y-3 sm:space-y-4">
              <div 
                className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-zinc-800 overflow-hidden border-2 border-dashed border-zinc-700 hover:border-primary/50 transition-colors cursor-pointer group"
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
                    <span className="text-sm text-muted-foreground">Загрузить</span>
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
                Рекомендуется: 1000x1000px, JPG или PNG
              </p>
            </div>
          </section>
          
          {/* 4. Ссылки на платформы */}
          <section className="overflow-hidden">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Ссылки на платформы</h2>
            
            {/* Add New Link */}
            <div className="flex flex-col sm:flex-row gap-2 mb-3 sm:mb-4">
              <select
                value={newLink.platform}
                onChange={(e) => setNewLink(prev => ({ ...prev, platform: e.target.value }))}
                className="h-10 sm:h-12 px-3 sm:px-4 rounded-xl bg-zinc-900 border border-zinc-800 text-foreground text-sm"
                data-testid="platform-select"
              >
                {PLATFORMS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="flex gap-2 flex-1">
                <Input
                  placeholder="https://..."
                  value={newLink.url}
                  onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                  data-testid="link-url-input"
                  className="h-10 sm:h-12 bg-zinc-900 border-zinc-800 flex-1"
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
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-zinc-900/50 border border-white/5 w-full overflow-hidden"
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
                  Ссылок пока нет. Добавьте первую ссылку выше.
                </p>
              )}
            </div>
          </section>
          
          {/* QR Code Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">QR-код</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {qrEnabled ? "Включен" : "Отключен"}
                </span>
                <Switch
                  checked={qrEnabled}
                  onCheckedChange={setQrEnabled}
                  data-testid="qr-toggle"
                />
              </div>
            </div>
            
            {qrEnabled && formData.slug && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-6 rounded-xl bg-zinc-900/50 border border-white/5"
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
                      Сканируйте для открытия страницы
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
                      Скачать PNG
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
            
            {qrEnabled && !formData.slug && (
              <p className="text-center text-muted-foreground py-6 border border-dashed border-zinc-800 rounded-xl">
                Введите URL-адрес выше для генерации QR-кода
              </p>
            )}
            
            {!qrEnabled && (
              <p className="text-center text-muted-foreground py-6 border border-dashed border-zinc-800 rounded-xl">
                QR-код отключен
              </p>
            )}
          </section>
        </div>
        
        {/* Live Preview */}
        <div className="hidden lg:block sticky top-24 h-fit">
          <h2 className="text-lg font-semibold mb-4">Предпросмотр</h2>
          <div className="relative mx-auto w-[300px]">
            {/* Phone Frame */}
            <div className="rounded-[40px] border-4 border-zinc-800 bg-zinc-900 p-2 shadow-2xl">
              <div className="rounded-[32px] overflow-hidden aspect-[9/16] relative">
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
                        <Music className="w-10 h-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <h3 className="font-display text-lg uppercase">
                    {formData.artist_name || "Имя артиста"}
                  </h3>
                  <p className="text-sm text-zinc-400 mb-6">
                    {formData.release_title || "Название релиза"}
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
                          <span className="text-sm font-medium">{platform.name}</span>
                        </div>
                      );
                    })}
                    
                    {links.filter(l => l.active).length === 0 && (
                      <div className="py-3 px-4 rounded-xl border border-dashed border-white/10 text-xs text-muted-foreground">
                        Здесь появятся ссылки
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
                    <p className="text-[10px] text-zinc-500">Powered by MyTrack</p>
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
