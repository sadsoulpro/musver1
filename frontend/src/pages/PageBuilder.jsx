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
import { FaSpotify, FaApple, FaYoutube, FaSoundcloud, FaLink, FaYandex, FaVk } from "react-icons/fa";
import { SiTidal } from "react-icons/si";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

const PLATFORMS = [
  { id: "spotify", name: "Spotify", icon: FaSpotify, color: "#1DB954" },
  { id: "apple", name: "Apple Music", icon: FaApple, color: "#FA233B" },
  { id: "youtube", name: "YouTube", icon: FaYoutube, color: "#FF0000" },
  { id: "soundcloud", name: "SoundCloud", icon: FaSoundcloud, color: "#FF5500" },
  { id: "tidal", name: "Tidal", icon: SiTidal, color: "#000000" },
  { id: "deezer", name: "Deezer", icon: FaLink, color: "#00C7F2" },
  { id: "yandex", name: "Yandex Music", icon: FaYandex, color: "#FF0000" },
  { id: "vk", name: "VK Music", icon: FaVk, color: "#4C75A3" },
  { id: "custom", name: "Custom Link", icon: FaLink, color: "#888888" },
];

export default function PageBuilder() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(pageId);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
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
      toast.error("Failed to load page");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-generate slug from title
    if (name === "title" && !isEditing) {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      setFormData(prev => ({ ...prev, slug }));
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
      setFormData(prev => ({ ...prev, cover_image: response.data.cover_url }));
      toast.success("Image uploaded");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const pageData = { ...formData, qr_enabled: qrEnabled };
      
      if (isEditing) {
        await api.put(`/pages/${pageId}`, pageData);
        toast.success("Page updated");
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
        toast.success("Page created");
        navigate(`/page/${response.data.id}/edit`);
        return;
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  const addLink = async () => {
    if (!newLink.url) {
      toast.error("Please enter a URL");
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
        toast.success("Link added");
      } catch (error) {
        toast.error("Failed to add link");
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
        toast.error("Failed to update link");
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
        toast.success("Link removed");
      } catch (error) {
        toast.error("Failed to remove link");
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
        toast.error("Failed to save order");
        // Revert on error
        setLinks(links);
      }
    }
  };

  // Scan source to auto-detect platform links
  const scanSource = async () => {
    if (!scanInput.trim()) {
      toast.error("Please enter an Apple Music link, Spotify link, or UPC/ISRC code");
      return;
    }

    setScanningSource(true);
    
    try {
      // Detect input type
      const isAppleMusicLink = scanInput.includes("music.apple.com") || scanInput.includes("itunes.apple.com");
      const isSpotifyLink = scanInput.includes("open.spotify.com") || scanInput.includes("spotify.com");
      const isUpcIsrc = /^[A-Z0-9]{12,14}$/i.test(scanInput.trim());

      if (!isAppleMusicLink && !isSpotifyLink && !isUpcIsrc) {
        toast.error("Please enter a valid Apple Music link, Spotify link, or UPC/ISRC code");
        setScanningSource(false);
        return;
      }

      // Extract track/album info
      let searchQuery = "";
      let coverArtUrl = "";
      let sourceUrl = scanInput.trim();

      if (isAppleMusicLink) {
        // Parse Apple Music URL to get identifiers
        const urlParts = scanInput.split("/");
        const albumIndex = urlParts.findIndex(p => p === "album");
        if (albumIndex > -1 && urlParts[albumIndex + 1]) {
          searchQuery = urlParts[albumIndex + 1].replace(/-/g, " ");
        }
        
        // Try to fetch cover art from iTunes API
        try {
          const searchTerm = encodeURIComponent(searchQuery);
          const itunesResponse = await fetch(`https://itunes.apple.com/search?term=${searchTerm}&media=music&limit=1`);
          const itunesData = await itunesResponse.json();
          if (itunesData.results && itunesData.results[0]) {
            coverArtUrl = itunesData.results[0].artworkUrl100?.replace("100x100", "600x600") || "";
          }
        } catch (e) {
          console.log("Could not fetch iTunes cover art");
        }
      } else if (isSpotifyLink) {
        // Parse Spotify URL to get track/album info
        // Format: https://open.spotify.com/track/xxxxx or /album/xxxxx
        const urlParts = scanInput.split("/");
        const trackIndex = urlParts.findIndex(p => p === "track" || p === "album");
        
        if (trackIndex > -1) {
          // Get the ID and try to extract name from URL or embed page
          const spotifyId = urlParts[trackIndex + 1]?.split("?")[0];
          
          // Use Spotify embed to try to get metadata
          try {
            const embedUrl = `https://open.spotify.com/embed/${urlParts[trackIndex]}/${spotifyId}`;
            // For search query, we'll use a simplified approach - extract from URL path
            // In production, you'd use Spotify API with proper auth
            const pathPart = urlParts[trackIndex + 1]?.split("?")[0];
            if (pathPart) {
              // Try to get track name from oEmbed
              const oembedResponse = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(scanInput)}`);
              const oembedData = await oembedResponse.json();
              if (oembedData.title) {
                searchQuery = oembedData.title;
                // Extract cover from thumbnail
                coverArtUrl = oembedData.thumbnail_url || "";
              }
            }
          } catch (e) {
            console.log("Could not fetch Spotify metadata, using generic search");
            searchQuery = "spotify track";
          }
        }
      } else {
        // UPC/ISRC code
        searchQuery = scanInput.trim();
      }

      if (!searchQuery) {
        searchQuery = "music release";
      }

      // Update cover image if we found one and don't have one yet
      if (coverArtUrl && !formData.cover_image) {
        setFormData(prev => ({ ...prev, cover_image: coverArtUrl }));
        toast.success("Cover art detected and applied!");
      }

      // Generate platform links based on the source
      const detectedLinks = [];
      
      // Add source platform link
      if (isAppleMusicLink) {
        const existingApple = links.find(l => l.platform === "apple");
        if (!existingApple) {
          detectedLinks.push({ platform: "apple", url: sourceUrl });
        }
      } else if (isSpotifyLink) {
        const existingSpotify = links.find(l => l.platform === "spotify");
        if (!existingSpotify) {
          detectedLinks.push({ platform: "spotify", url: sourceUrl });
        }
      }

      // Generate suggested links for other platforms
      const platformUrls = {};
      
      if (!isSpotifyLink) {
        platformUrls.spotify = `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}`;
      }
      if (!isAppleMusicLink) {
        platformUrls.apple = `https://music.apple.com/search?term=${encodeURIComponent(searchQuery)}`;
      }
      
      platformUrls.youtube = `https://music.youtube.com/search?q=${encodeURIComponent(searchQuery)}`;
      platformUrls.deezer = `https://www.deezer.com/search/${encodeURIComponent(searchQuery)}`;
      platformUrls.tidal = `https://listen.tidal.com/search?q=${encodeURIComponent(searchQuery)}`;
      platformUrls.soundcloud = `https://soundcloud.com/search?q=${encodeURIComponent(searchQuery)}`;
      platformUrls.yandex = `https://music.yandex.com/search?text=${encodeURIComponent(searchQuery)}`;
      platformUrls.vk = `https://vk.com/audio?q=${encodeURIComponent(searchQuery)}`;

      // Add links for platforms that don't exist yet
      for (const [platform, url] of Object.entries(platformUrls)) {
        const existing = links.find(l => l.platform === platform);
        if (!existing) {
          detectedLinks.push({ platform, url });
        }
      }

      if (detectedLinks.length === 0) {
        toast.info("All platforms already have links");
        setScanningSource(false);
        return;
      }

      // Add detected links
      for (const linkData of detectedLinks) {
        if (isEditing) {
          try {
            const response = await api.post(`/pages/${pageId}/links`, {
              platform: linkData.platform,
              url: linkData.url,
              active: true
            });
            setLinks(prev => [...prev, response.data]);
          } catch (error) {
            console.error(`Failed to add ${linkData.platform} link`);
          }
        } else {
          setLinks(prev => [...prev, {
            id: Date.now().toString() + linkData.platform,
            platform: linkData.platform,
            url: linkData.url,
            active: true,
            clicks: 0
          }]);
        }
      }

      toast.success(`Added ${detectedLinks.length} platform links`);
      setScanInput("");
    } catch (error) {
      toast.error("Failed to scan source");
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-semibold">{isEditing ? "Edit Page" : "Create New Page"}</h1>
          </div>
          <div className="flex items-center gap-3">
            {isEditing && formData.slug && (
              <a href={`/${formData.slug}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="rounded-full" data-testid="view-public-page-btn">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Public Page
                </Button>
              </a>
            )}
            <Button 
              onClick={handleSubmit}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 rounded-full"
              data-testid="save-page-btn"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto p-6 grid lg:grid-cols-2 gap-10">
        {/* Form */}
        <div className="space-y-8">
          {/* Basic Info */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Basic Info</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Page Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="My New Single"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  data-testid="page-title-input"
                  className="h-12 bg-zinc-900 border-zinc-800"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <div className="flex items-center">
                  <span className="text-muted-foreground text-sm mr-2">/</span>
                  <Input
                    id="slug"
                    name="slug"
                    placeholder="my-new-single"
                    value={formData.slug}
                    onChange={handleChange}
                    required
                    data-testid="page-slug-input"
                    className="h-12 bg-zinc-900 border-zinc-800"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="artist_name">Artist Name</Label>
                  <Input
                    id="artist_name"
                    name="artist_name"
                    placeholder="Your Name"
                    value={formData.artist_name}
                    onChange={handleChange}
                    required
                    data-testid="artist-name-input"
                    className="h-12 bg-zinc-900 border-zinc-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="release_title">Release Title</Label>
                  <Input
                    id="release_title"
                    name="release_title"
                    placeholder="Song or Album Name"
                    value={formData.release_title}
                    onChange={handleChange}
                    required
                    data-testid="release-title-input"
                    className="h-12 bg-zinc-900 border-zinc-800"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Tell fans about this release..."
                  value={formData.description}
                  onChange={handleChange}
                  data-testid="description-input"
                  className="bg-zinc-900 border-zinc-800 min-h-[100px]"
                />
              </div>
            </div>
          </section>
          
          {/* Cover Image */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Cover Image</h2>
            <div className="space-y-4">
              <div 
                className="relative w-40 h-40 rounded-2xl bg-zinc-800 overflow-hidden border-2 border-dashed border-zinc-700 hover:border-primary/50 transition-colors cursor-pointer group"
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
                    <span className="text-sm text-muted-foreground">Upload</span>
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
              <p className="text-sm text-muted-foreground">
                Recommended: 1000x1000px, JPG or PNG
              </p>
            </div>
          </section>
          
          {/* Links */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Platform Links</h2>
            
            {/* Scan Source */}
            <div className="mb-6 p-4 rounded-xl bg-zinc-900/50 border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Scan Source</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Enter an Apple Music link or UPC/ISRC code to auto-populate platform links
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Apple Music link or UPC/ISRC code..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  data-testid="scan-source-input"
                  className="h-10 bg-zinc-800 border-zinc-700 flex-1 text-sm"
                />
                <Button 
                  onClick={scanSource}
                  disabled={scanningSource}
                  className="h-10 bg-primary hover:bg-primary/90"
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
            
            {/* Add New Link */}
            <div className="flex gap-2 mb-4">
              <select
                value={newLink.platform}
                onChange={(e) => setNewLink(prev => ({ ...prev, platform: e.target.value }))}
                className="h-12 px-4 rounded-xl bg-zinc-900 border border-zinc-800 text-foreground"
                data-testid="platform-select"
              >
                {PLATFORMS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <Input
                placeholder="https://..."
                value={newLink.url}
                onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                data-testid="link-url-input"
                className="h-12 bg-zinc-900 border-zinc-800 flex-1"
              />
              <Button 
                onClick={addLink}
                className="h-12 bg-primary hover:bg-primary/90"
                data-testid="add-link-btn"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Links List */}
            <div className="space-y-2">
              {links.map((link, i) => {
                const platform = getPlatformInfo(link.platform);
                const Icon = platform.icon;
                
                return (
                  <motion.div
                    key={link.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-white/5"
                    data-testid={`link-item-${link.id}`}
                  >
                    {/* Move Up/Down Buttons */}
                    <div className="flex flex-col gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        onClick={() => moveLink(i, -1)}
                        disabled={i === 0}
                        data-testid={`move-up-${link.id}`}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        onClick={() => moveLink(i, 1)}
                        disabled={i === links.length - 1}
                        data-testid={`move-down-${link.id}`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: platform.color }}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{platform.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={link.active}
                        onCheckedChange={() => toggleLink(link.id, link.active)}
                        data-testid={`toggle-link-${link.id}`}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => deleteLink(link.id)}
                        className="text-muted-foreground hover:text-red-400"
                        data-testid={`delete-link-${link.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
              
              {links.length === 0 && (
                <p className="text-center text-muted-foreground py-8 border border-dashed border-zinc-800 rounded-xl">
                  No links added yet. Add your first platform link above.
                </p>
              )}
            </div>
          </section>
          
          {/* QR Code Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">QR Code</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {qrEnabled ? "Enabled" : "Disabled"}
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
                      Scan to open your page
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
                      Download PNG
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
            
            {qrEnabled && !formData.slug && (
              <p className="text-center text-muted-foreground py-6 border border-dashed border-zinc-800 rounded-xl">
                Enter a URL slug above to generate QR code
              </p>
            )}
            
            {!qrEnabled && (
              <p className="text-center text-muted-foreground py-6 border border-dashed border-zinc-800 rounded-xl">
                QR code is disabled
              </p>
            )}
          </section>
        </div>
        
        {/* Live Preview */}
        <div className="hidden lg:block sticky top-24 h-fit">
          <h2 className="text-lg font-semibold mb-4">Live Preview</h2>
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
                    {formData.artist_name || "Artist Name"}
                  </h3>
                  <p className="text-sm text-zinc-400 mb-6">
                    {formData.release_title || "Release Title"}
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
                        Links will appear here
                      </div>
                    )}
                  </div>
                  
                  {/* Footer */}
                  <div className="mt-auto pt-4">
                    <p className="text-[10px] text-zinc-500">Powered by MyTrack.cc</p>
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
