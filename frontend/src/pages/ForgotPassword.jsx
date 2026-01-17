import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";
import MuslinkLogo from "@/components/MuslinkLogo";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { t } = useLanguage();
  const { theme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
      setSubmitted(true);
      toast.success(t('forgotPassword', 'successToast'));
    } catch (error) {
      toast.error(typeof (error.response?.data?.detail) === "string" ? error.response.data.detail : t('errors', 'generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16">
        <div className="w-full max-w-md mx-auto">
          <Link to="/login" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t('forgotPassword', 'backToLogin')}
          </Link>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-8">
              <Link to="/">
                <MuslinkLogo height={32} theme={theme} />
              </Link>
            </div>
            
            {!submitted ? (
              <>
                <h1 className="text-3xl font-semibold mb-2">{t('forgotPassword', 'title')}</h1>
                <p className="text-muted-foreground mb-8">
                  {t('forgotPassword', 'description')}
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-Mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="mail@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      data-testid="forgot-email-input"
                      className="h-12 bg-muted border-border focus:border-primary"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={loading}
                    data-testid="forgot-submit-btn"
                    className="w-full h-12 bg-primary hover:bg-primary/90 rounded-xl font-semibold"
                  >
                    {loading ? t('forgotPassword', 'sending') : t('forgotPassword', 'submit')}
                  </Button>
                </form>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h1 className="text-3xl font-semibold mb-4">{t('forgotPassword', 'checkEmail')}</h1>
                <p className="text-muted-foreground mb-8">
                  {t('forgotPassword', 'sentTo')} <span className="text-foreground font-medium">{email}</span>
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  {t('forgotPassword', 'checkSpam')}
                </p>
                <Button 
                  variant="outline"
                  onClick={() => setSubmitted(false)}
                  className="rounded-xl"
                  data-testid="try-again-btn"
                >
                  {t('forgotPassword', 'sendAgain')}
                </Button>
              </motion.div>
            )}
            
            <p className="mt-8 text-center text-muted-foreground">
              {t('forgotPassword', 'rememberPassword')}{" "}
              <Link to="/login" className="text-primary hover:underline" data-testid="login-link">
                {t('nav', 'login')}
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
      
      {/* Right Side - Visual */}
      <div className={`hidden lg:flex flex-1 ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-primary/20 via-zinc-900 to-background' 
          : 'bg-gradient-to-br from-primary/10 via-gray-100 to-white'
      } items-center justify-center p-12`}>
        <div className="text-center">
          <div className="w-32 h-32 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-16 h-16 text-primary" />
          </div>
          <h2 className={`font-display text-4xl mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {t('forgotPassword', 'rightTitle')}
          </h2>
          <p className={`max-w-sm ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
            {t('forgotPassword', 'rightDesc')}
          </p>
        </div>
      </div>
    </div>
  );
}
