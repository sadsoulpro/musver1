import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api, useAuth } from "@/App";
import { toast } from "sonner";
import { 
  Globe, Plus, Trash2, Check, X, AlertCircle, Crown, 
  Loader2, ExternalLink, Copy, CheckCircle2, Link2,
  Mail, Send, Instagram, Music2, Twitter, LinkIcon, Save
} from "lucide-react";
import { FaTelegram, FaInstagram, FaVk, FaTiktok, FaTwitter, FaGlobe } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import ProFeatureModal from "@/components/ProFeatureModal";
import { useLanguage } from "@/contexts/LanguageContext";

const SOCIAL_PLATFORMS = [
  { id: "telegram", name: "Telegram", icon: FaTelegram, placeholder: "@username", color: "#229ED9" },
  { id: "instagram", name: "Instagram", icon: FaInstagram, placeholder: "@username", color: "#E4405F" },
  { id: "vk", name: "VKontakte", icon: FaVk, placeholder: "vk.com/username", color: "#4C75A3" },
  { id: "tiktok", name: "TikTok", icon: FaTiktok, placeholder: "@username", color: "#000000" },
  { id: "twitter", name: "X (Twitter)", icon: FaTwitter, placeholder: "@username", color: "#1DA1F2" },
  { id: "website", name: "Website", icon: FaGlobe, placeholder: "https://example.com", color: "#6B7280" },
];

export default function Domains() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [subdomains, setSubdomains] = useState([]);
  const [maxLimit, setMaxLimit] = useState(1);
  const [canAdd, setCanAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newSubdomain, setNewSubdomain] = useState("");
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  
  // Contact info state
  const [contactEmail, setContactEmail] = useState("");
  const [socialLinks, setSocialLinks] = useState({
    telegram: "",
    instagram: "",
    vk: "",
    tiktok: "",
    twitter: "",
    website: ""
  });
  const [profileDescription, setProfileDescription] = useState("");
  const [artistName, setArtistName] = useState("");
  const [savingContacts, setSavingContacts] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [proModalOpen, setProModalOpen] = useState(false);

  useEffect(() => {
    fetchSubdomains();
    fetchContactInfo();
  }, []);

  // Debounced availability check
  useEffect(() => {
    if (!newSubdomain || newSubdomain.length < 3) {
      setAvailability(null);
      return;
    }

    const timer = setTimeout(() => {
      checkAvailability(newSubdomain);
    }, 300);

    return () => clearTimeout(timer);
  }, [newSubdomain]);

  const fetchSubdomains = async () => {
    try {
      const response = await api.get("/subdomains");
      setSubdomains(response.data.subdomains || []);
      setMaxLimit(response.data.max_limit);
      setCanAdd(response.data.can_add);
    } catch (error) {
      toast.error(t('errors', 'loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchContactInfo = async () => {
    try {
      const response = await api.get("/profile/contacts");
      setContactEmail(response.data.contact_email || "");
      setProfileDescription(response.data.profile_description || "");
      setArtistName(response.data.artist_name || "");
      setSocialLinks(response.data.social_links || {
        telegram: "",
        instagram: "",
        vk: "",
        tiktok: "",
        twitter: "",
        website: ""
      });
    } catch (error) {
      console.error("Failed to fetch contact info", error);
    } finally {
      setContactsLoading(false);
    }
  };

  const saveContactInfo = async () => {
    setSavingContacts(true);
    try {
      await api.put("/profile/contacts", {
        contact_email: contactEmail,
        profile_description: profileDescription,
        artist_name: artistName,
        social_links: socialLinks
      });
      toast.success(t('common', 'success'));
    } catch (error) {
      toast.error(t('errors', 'saveFailed'));
    } finally {
      setSavingContacts(false);
    }
  };

  const handleSocialLinkChange = (platform, value) => {
    setSocialLinks(prev => ({
      ...prev,
      [platform]: value
    }));
  };

  const checkAvailability = async (subdomain) => {
    setChecking(true);
    try {
      const response = await api.get(`/subdomains/check/${subdomain}`);
      setAvailability(response.data);
    } catch (error) {
      setAvailability({ available: false, reason: t('errors', 'generic') });
    } finally {
      setChecking(false);
    }
  };

  const createSubdomain = async () => {
    if (!newSubdomain || !availability?.available) return;

    setCreating(true);
    try {
      await api.post("/subdomains", { subdomain: newSubdomain.toLowerCase() });
      toast.success(t('common', 'success'));
      setNewSubdomain("");
      setAvailability(null);
      fetchSubdomains();
    } catch (error) {
      toast.error(typeof (error.response?.data?.detail) === "string" ? error.response.data.detail : t('errors', 'generic'));
    } finally {
      setCreating(false);
    }
  };

  const toggleSubdomain = async (id, currentActive) => {
    try {
      await api.put(`/subdomains/${id}`, { is_active: !currentActive });
      toast.success(t('common', 'success'));
      fetchSubdomains();
    } catch (error) {
      toast.error(t('errors', 'generic'));
    }
  };

  const deleteSubdomain = async (id) => {
    if (!confirm(t('domains', 'removeDomain') + "?")) return;

    try {
      await api.delete(`/subdomains/${id}`);
      toast.success(t('common', 'success'));
      fetchSubdomains();
    } catch (error) {
      toast.error(t('errors', 'deleteFailed'));
    }
  };

  const copyToClipboard = (subdomain) => {
    const url = `${subdomain}.mytrack.cc`;
    navigator.clipboard.writeText(url);
    setCopiedId(subdomain);
    toast.success(t('common', 'copied'));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const limitDisplay = maxLimit === -1 ? "∞" : maxLimit;
  const usedCount = subdomains.length;

  if (loading) {
    return (
      <Sidebar>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
              <Globe className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-muted-foreground">{t('common', 'loading')}</p>
          </div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <div className="min-h-screen bg-background">
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold">{t('domains', 'title')}</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t('domains', 'subtitle')}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Usage indicator */}
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl panel-card">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t('common', 'total')}</p>
                  <p className="text-lg font-bold">
                    <span className={usedCount >= maxLimit && maxLimit !== -1 ? "text-red-400" : "text-white"}>
                      {usedCount}
                    </span>
                    <span className="text-muted-foreground"> / {limitDisplay}</span>
                  </p>
                </div>
                <div className={`px-2 py-1 rounded-lg text-xs ${
                  user?.plan === 'pro' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {user?.plan?.toUpperCase() || 'FREE'}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Add Subdomain Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 sm:p-6 rounded-2xl panel-card mb-6"
          >
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              {t('domains', 'addDomain')}
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <div className="flex items-center">
                  <Input
                    value={newSubdomain}
                    onChange={(e) => setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder={t('domains', 'domainPlaceholder')}
                    className="rounded-r-none border-r-0 bg-muted/50 lowercase"
                    disabled={!canAdd}
                    maxLength={32}
                  />
                  <div className="h-10 px-3 flex items-center bg-muted border border-l-0 border-border rounded-r-lg text-muted-foreground text-sm">
                    .mytrack.cc
                  </div>
                </div>
                
                {/* Availability indicator */}
                <AnimatePresence>
                  {newSubdomain.length >= 3 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute left-0 -bottom-6 text-xs flex items-center gap-1"
                    >
                      {checking ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="text-muted-foreground">{t('common', 'loading')}</span>
                        </>
                      ) : availability?.available ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">{t('common', 'active')}</span>
                        </>
                      ) : availability ? (
                        <>
                          <X className="w-3 h-3 text-red-400" />
                          <span className="text-red-400">{availability.reason}</span>
                        </>
                      ) : null}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <Button
                onClick={createSubdomain}
                disabled={!canAdd || !availability?.available || creating}
                className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 min-w-[120px]"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    {t('common', 'create')}
                  </>
                )}
              </Button>
            </div>
            
            {/* Limit warning */}
            {!canAdd && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-amber-400">
                    {t('domains', 'proRequired')}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 flex-shrink-0"
                  onClick={() => {
                    const submittedEmail = localStorage.getItem('waitlist_email_submitted');
                    if (submittedEmail) {
                      toast.info(t('proModal', 'alreadySubmitted'));
                    } else {
                      setProModalOpen(true);
                    }
                  }}
                >
                  <Crown className="w-3 h-3 mr-1" />
                  {t('common', 'upgrade')}
                </Button>
              </motion.div>
            )}
          </motion.div>

          {/* Subdomains List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              {t('nav', 'domains')}
              <span className="text-xs text-muted-foreground font-normal">({subdomains.length})</span>
            </h2>
            
            {subdomains.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-border">
                <Globe className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">{t('analytics', 'noData')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subdomains.map((sub, idx) => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.05 }}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      sub.is_active 
                        ? 'bg-card/50 border-border hover:border-border' 
                        : 'bg-card/30 border-border'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Domain Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          sub.is_active 
                            ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20' 
                            : 'bg-muted'
                        }`}>
                          <Globe className={`w-5 h-5 ${sub.is_active ? 'text-emerald-400' : 'text-zinc-500'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-mono font-semibold ${!sub.is_active && 'text-zinc-500'}`}>
                              {sub.subdomain}.mytrack.cc
                            </p>
                            {!sub.is_active && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground">
                                {t('common', 'disabled')}
                              </span>
                            )}
                            {sub.disabled_by_admin && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-400">
                                {t('domains', 'failed')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(sub.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pl-14 sm:pl-0">
                        {/* Copy button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(sub.subdomain)}
                          className="h-9 w-9 rounded-xl"
                        >
                          {copiedId === sub.subdomain ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>

                        {/* External link */}
                        <a 
                          href={`https://${sub.subdomain}.mytrack.cc`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>

                        {/* Toggle */}
                        <button
                          onClick={() => toggleSubdomain(sub.id, sub.is_active)}
                          disabled={sub.disabled_by_admin}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            sub.is_active ? 'bg-emerald-500' : 'bg-muted'
                          } ${sub.disabled_by_admin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                            sub.is_active ? 'translate-x-6' : 'translate-x-0.5'
                          }`} />
                        </button>

                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSubdomain(sub.id)}
                          className="h-9 w-9 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Contact Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-6 p-5 sm:p-6 rounded-2xl panel-card"
          >
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              {t('settings', 'profile')}
            </h2>
            
            {contactsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Artist Name */}
                <div className="mb-4">
                  <Label htmlFor="artist_name" className="text-sm mb-2 block">
                    {t('common', 'artist')}
                  </Label>
                  <Input
                    id="artist_name"
                    type="text"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    placeholder={t('pageBuilder', 'artistPlaceholder')}
                    className="bg-muted/50"
                    maxLength={50}
                  />
                </div>

                {/* Profile Description */}
                <div className="mb-4">
                  <Label htmlFor="profile_description" className="text-sm mb-2 block">
                    {t('settings', 'bio')}
                  </Label>
                  <Textarea
                    id="profile_description"
                    value={profileDescription}
                    onChange={(e) => setProfileDescription(e.target.value)}
                    placeholder={t('settings', 'bioPlaceholder')}
                    className="bg-muted/50 resize-none"
                    rows={3}
                    maxLength={200}
                  />
                </div>
                
                {/* Contact Email */}
                <div className="mb-4">
                  <Label htmlFor="contact_email" className="text-sm mb-2 block">
                    {t('common', 'email')}
                  </Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder={t('auth', 'emailPlaceholder')}
                    className="bg-muted/50"
                  />
                </div>
                
                {/* Social Links */}
                <div className="space-y-3">
                  <Label className="text-sm">{t('settings', 'socialLinks')}</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SOCIAL_PLATFORMS.map((platform) => {
                      const Icon = platform.icon;
                      return (
                        <div key={platform.id} className="flex items-center gap-2">
                          <div 
                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${platform.color}20` }}
                          >
                            <Icon className="w-4 h-4" style={{ color: platform.color }} />
                          </div>
                          <Input
                            value={socialLinks[platform.id] || ""}
                            onChange={(e) => handleSocialLinkChange(platform.id, e.target.value)}
                            placeholder={platform.placeholder}
                            className="bg-muted/50 h-9 text-sm"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Save Button */}
                <Button
                  onClick={saveContactInfo}
                  disabled={savingContacts}
                  className="mt-5 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                >
                  {savingContacts ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {t('common', 'save')}
                </Button>
              </>
            )}
          </motion.div>

          {/* Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-blue-400">
              <AlertCircle className="w-4 h-4" />
              {t('domains', 'instructions')}
            </h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>{t('domains', 'step1')} <code className="text-blue-300 bg-blue-500/10 px-1 rounded">mytrack.cc</code></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>{t('domains', 'step2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>{t('domains', 'step3')}</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </div>

      {/* PRO Feature Modal */}
      <ProFeatureModal
        open={proModalOpen}
        onOpenChange={setProModalOpen}
        featureName="Custom Domains"
      />
    </Sidebar>
  );
}
