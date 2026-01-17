import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Mail, Check, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/App';
import { toast } from 'sonner';

// Cooldown in milliseconds (30 seconds)
const COOLDOWN_MS = 30000;
const COOLDOWN_KEY = 'waitlist_last_submit';

export default function ProFeatureModal({ open, onOpenChange, featureName = "" }) {
  const { t, language } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setEmail('');
      setSuccess(false);
      setError('');
    }
  }, [open]);

  // Check cooldown
  const checkCooldown = () => {
    try {
      const lastSubmit = localStorage.getItem(COOLDOWN_KEY);
      if (lastSubmit) {
        const elapsed = Date.now() - parseInt(lastSubmit);
        if (elapsed < COOLDOWN_MS) {
          const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
          return remaining;
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
    return 0;
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Check cooldown
    const cooldownRemaining = checkCooldown();
    if (cooldownRemaining > 0) {
      setError(t('proModal', 'waitCooldown').replace('{seconds}', cooldownRemaining));
      return;
    }

    // Validate email
    if (!email.trim()) {
      setError(t('proModal', 'emailRequired'));
      return;
    }

    if (!validateEmail(email)) {
      setError(t('proModal', 'invalidEmail'));
      return;
    }

    setLoading(true);

    try {
      await api.post('/waitlist', {
        email: email.trim(),
        feature: featureName,
        language: language
      });

      // Set cooldown
      localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
      // Save that user has submitted email
      localStorage.setItem('waitlist_email_submitted', email.trim());
      
      setSuccess(true);
      toast.success(t('proModal', 'successToast'));
    } catch (err) {
      if (err.response?.status === 429) {
        setError(t('proModal', 'tooManyRequests'));
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError(t('proModal', 'submitError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => t('proModal', 'title');
  const getDescription = () => t('proModal', 'description');
  const getButtonText = () => t('proModal', 'submit');
  const getSuccessTitle = () => t('proModal', 'successTitle');
  const getSuccessMessage = () => t('proModal', 'successMessage');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-xl">
            {success ? getSuccessTitle() : getTitle()}
          </DialogTitle>
          <DialogDescription className="text-base">
            {success ? getSuccessMessage() : getDescription()}
          </DialogDescription>
        </DialogHeader>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                  data-testid="waitlist-email-input"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
              disabled={loading}
              data-testid="waitlist-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common', 'loading')}
                </>
              ) : (
                getButtonText()
              )}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-emerald-500" />
            </div>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="mt-4"
            >
              {t('common', 'close')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
