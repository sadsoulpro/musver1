import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/App";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MuslinkLogo from "@/components/MuslinkLogo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const data = await login(email, password);
      toast.success(t('auth', 'loginTitle') + "!");
      
      if (data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/multilinks");
      }
    } catch (error) {
      const errorDetail = error.response?.data?.detail;
      // Show localized message for invalid credentials
      if (errorDetail === "Invalid credentials") {
        toast.error(t('auth', 'invalidCredentials'));
      } else {
        toast.error(typeof errorDetail === "string" ? errorDetail : t('auth', 'invalidCredentials'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="compact" />
      </div>
      
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 py-8 sm:py-12 lg:px-16">
        <div className="w-full max-w-md mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 sm:mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm sm:text-base">{t('common', 'back')}</span>
          </Link>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-6 sm:mb-8">
              <Link to="/">
                <MuslinkLogo height={32} theme={theme} />
              </Link>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-semibold mb-2">{t('auth', 'loginTitle')}</h1>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
              {t('auth', 'loginSubtitle')}
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">{t('common', 'email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth', 'emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="login-email-input"
                  className="h-11 sm:h-12 bg-muted border-border focus:border-primary"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">{t('common', 'password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="login-password-input"
                  className="h-11 sm:h-12 bg-muted border-border focus:border-primary"
                />
                <div className="text-right">
                  <Link to="/forgot-password" className="text-xs sm:text-sm text-primary hover:underline" data-testid="forgot-password-link">
                    {t('auth', 'forgotPassword')}
                  </Link>
                </div>
              </div>
              
              <Button 
                type="submit" 
                disabled={loading}
                data-testid="login-submit-btn"
                className="w-full h-11 sm:h-12 bg-primary hover:bg-primary/90 rounded-xl font-semibold"
              >
                {loading ? t('common', 'loading') : t('auth', 'loginButton')}
              </Button>
            </form>
            
            <p className="mt-6 sm:mt-8 text-center text-sm sm:text-base text-muted-foreground">
              {t('auth', 'noAccount')}{" "}
              <Link to="/register" className="text-primary hover:underline" data-testid="register-link">
                {t('auth', 'signUp')}
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
      
      {/* Right Side - Visual (hidden on mobile/tablet) */}
      <div className={`hidden lg:flex flex-1 ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-primary/20 via-zinc-900 to-background' 
          : 'bg-gradient-to-br from-primary/10 via-gray-100 to-white'
      } items-center justify-center p-12`}>
        <div className="text-center">
          <div className="w-32 h-32 xl:w-40 xl:h-40 flex items-center justify-center mx-auto mb-6">
            <MuslinkLogo height={80} theme={theme} />
          </div>
          <h2 className={`font-display text-2xl xl:text-3xl mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {t('auth', 'sideTitle')}
          </h2>
          <p className={`max-w-sm ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
            {t('auth', 'sideSubtitle')}
          </p>
        </div>
      </div>
    </div>
  );
}
