import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, useAuth } from "@/App";
import { toast } from "sonner";
import { BadgeCheck, Clock, CheckCircle, XCircle, Send, Info, ToggleLeft, ToggleRight, Crown } from "lucide-react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Verification() {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [badgeLoading, setBadgeLoading] = useState(false);
  
  const canVerify = user?.plan_config?.can_verify_profile || user?.plan === 'pro';
  
  const [form, setForm] = useState({ artist_name: "", social_links: "", description: "" });

  useEffect(() => { fetchStatus(); }, []);

  const fetchStatus = async () => {
    try {
      const response = await api.get("/verification/status");
      setStatus(response.data);
    } catch (error) {
      toast.error(t('errors', 'loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.artist_name.trim()) { toast.error(t('errors', 'validationError')); return; }
    if (!form.social_links.trim()) { toast.error(t('errors', 'validationError')); return; }
    if (!form.description.trim()) { toast.error(t('errors', 'validationError')); return; }
    
    setSubmitting(true);
    try {
      await api.post("/verification/request", form);
      toast.success(t('verification', 'applicationSent'));
      fetchStatus();
      setForm({ artist_name: "", social_links: "", description: "" });
    } catch (error) {
      toast.error(typeof (error.response?.data?.detail) === "string" ? error.response.data.detail : t('errors', 'saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleBadge = async () => {
    setBadgeLoading(true);
    try {
      const response = await api.put("/settings/verification-badge");
      toast.success(t('verification', 'badgeUpdated'));
      fetchStatus();
      if (refreshUser) await refreshUser();
    } catch (error) {
      toast.error(t('errors', 'saveFailed'));
    } finally {
      setBadgeLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (status?.verified) {
      return (
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
          <span className="text-green-400 font-medium text-sm sm:text-base">{t('verification', 'approved')}</span>
        </div>
      );
    }
    switch (status?.verification_status) {
      case "pending":
        return (
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
            <span className="text-yellow-400 font-medium text-sm sm:text-base">{t('verification', 'pending')}</span>
          </div>
        );
      case "rejected":
        return (
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
            <span className="text-red-400 font-medium text-sm sm:text-base">{t('verification', 'rejected')}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-zinc-500/10 border border-zinc-500/30 rounded-lg">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-500" />
            <span className="text-zinc-400 font-medium text-sm sm:text-base">{t('verification', 'notVerified')}</span>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <Sidebar>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-10 relative">
        {/* PRO Overlay for FREE users */}
        {!canVerify && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md rounded-2xl">
            <div className="text-center p-8 max-w-md">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Crown className="w-8 h-8 text-yellow-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">{t('verification', 'applyTitle')} - {t('analytics', 'proFeature')}</h2>
              <p className="text-muted-foreground mb-6">{t('verification', 'applyDesc')}</p>
              <Link to="/pricing">
                <Button size="lg" className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                  <Crown className="w-4 h-4 mr-2" />
                  {t('common', 'upgrade')}
                </Button>
              </Link>
            </div>
          </div>
        )}
        
        <div className={!canVerify ? 'filter blur-md pointer-events-none' : ''}>
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-display mb-2 flex items-center gap-2">
            <BadgeCheck className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            {t('verification', 'title')}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('verification', 'subtitle')}
          </p>
        </div>
        
        {/* Current Status */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5 mb-4 sm:mb-6">
          <h2 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">{t('verification', 'status')}</h2>
          {getStatusBadge()}
          {status?.verified && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4">
              {t('verification', 'benefit1')}
            </p>
          )}
        </motion.div>
        
        {/* Badge Settings */}
        {status?.verified && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-4 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5 mb-4 sm:mb-6">
            <h2 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">{t('verification', 'showBadge')}</h2>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-zinc-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  {status?.show_badge !== false ? <ToggleRight className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> : <ToggleLeft className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-500" />}
                </div>
                <div>
                  <p className="font-medium text-sm sm:text-base">{t('verification', 'showBadge')}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{status?.show_badge !== false ? t('common', 'enabled') : t('common', 'disabled')}</p>
                </div>
              </div>
              <Button variant={status?.show_badge !== false ? "default" : "outline"} onClick={toggleBadge} disabled={badgeLoading} className={`w-full sm:w-auto ${status?.show_badge !== false ? "bg-primary hover:bg-primary/90" : ""}`} size="sm">
                {badgeLoading ? "..." : status?.show_badge !== false ? t('verification', 'hideBadge') : t('verification', 'showBadge')}
              </Button>
            </div>
          </motion.div>
        )}
        
        {/* Pending Request */}
        {status?.pending_request && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-4 sm:p-6 rounded-2xl bg-yellow-500/5 border border-yellow-500/20 mb-4 sm:mb-6">
            <h2 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
              {t('verification', 'pending')}
            </h2>
            <div className="space-y-1 text-xs sm:text-sm">
              <p><span className="text-muted-foreground">{t('common', 'artist')}:</span> {status.pending_request.artist_name}</p>
              <p><span className="text-muted-foreground">{t('dashboard', 'lastUpdated')}:</span> {new Date(status.pending_request.created_at).toLocaleDateString()}</p>
            </div>
          </motion.div>
        )}
        
        {/* Verification Form */}
        {!status?.verified && !status?.pending_request && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-4 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5">
            <h2 className="font-semibold text-sm sm:text-base mb-2">{t('verification', 'applyTitle')}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
              {t('verification', 'applyDesc')}
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="artist_name" className="text-sm">{t('common', 'artist')}</Label>
                <Input id="artist_name" value={form.artist_name} onChange={(e) => setForm(prev => ({ ...prev, artist_name: e.target.value }))} placeholder="DJ Shadow" className="bg-zinc-800 border-zinc-700" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="social_links" className="text-sm">{t('settings', 'socialLinks')}</Label>
                <Textarea id="social_links" value={form.social_links} onChange={(e) => setForm(prev => ({ ...prev, social_links: e.target.value }))} placeholder="Instagram, VK, YouTube..." className="bg-zinc-800 border-zinc-700 min-h-[80px]" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm">{t('common', 'description')}</Label>
                <Textarea id="description" value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="..." className="bg-zinc-800 border-zinc-700 min-h-[100px]" />
              </div>
              
              <Button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary/90">
                {submitting ? t('verification', 'applying') : <><Send className="w-4 h-4 mr-2" />{t('verification', 'applyButton')}</>}
              </Button>
            </form>
          </motion.div>
        )}
        
        {/* Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4 sm:mt-6 p-4 sm:p-6 rounded-2xl bg-zinc-900/30 border border-white/5">
          <h3 className="font-semibold text-sm sm:text-base mb-3">{t('verification', 'benefits')}</h3>
          <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><BadgeCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />{t('verification', 'benefit1')}</li>
            <li className="flex items-start gap-2"><BadgeCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />{t('verification', 'benefit2')}</li>
            <li className="flex items-start gap-2"><BadgeCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />{t('verification', 'benefit3')}</li>
          </ul>
        </motion.div>
        </div>
      </div>
    </Sidebar>
  );
}
