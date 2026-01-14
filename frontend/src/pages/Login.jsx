import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/App";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const data = await login(email, password);
      toast.success("С возвращением!");
      
      if (data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/multilinks");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Неверные учётные данные");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 py-8 sm:py-12 lg:px-16">
        <div className="w-full max-w-md mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 sm:mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm sm:text-base">На главную</span>
          </Link>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-6 sm:mb-8">
              <Link to="/">
                <img 
                  src="/MyTrack-logo-main.svg" 
                  alt="MyTrack" 
                  className="h-8 sm:h-10 w-auto"
                />
              </Link>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-semibold mb-2">Здравствуйте!</h1>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
              Войдите, чтобы создать мультиссылку.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="mail@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="login-email-input"
                  className="h-11 sm:h-12 bg-zinc-900 border-zinc-800 focus:border-primary"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="login-password-input"
                  className="h-11 sm:h-12 bg-zinc-900 border-zinc-800 focus:border-primary"
                />
                <div className="text-right">
                  <Link to="/forgot-password" className="text-xs sm:text-sm text-primary hover:underline" data-testid="forgot-password-link">
                    Забыли пароль?
                  </Link>
                </div>
              </div>
              
              <Button 
                type="submit" 
                disabled={loading}
                data-testid="login-submit-btn"
                className="w-full h-11 sm:h-12 bg-primary hover:bg-primary/90 rounded-xl font-semibold"
              >
                {loading ? "Вход..." : "Войти"}
              </Button>
            </form>
            
            <p className="mt-6 sm:mt-8 text-center text-sm sm:text-base text-muted-foreground">
              Нет аккаунта?{" "}
              <Link to="/register" className="text-primary hover:underline" data-testid="register-link">
                Зарегистрироваться
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
      
      {/* Right Side - Visual (hidden on mobile/tablet) */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/20 via-zinc-900 to-background items-center justify-center p-12">
        <div className="text-center">
          <div className="w-32 h-32 xl:w-40 xl:h-40 flex items-center justify-center mx-auto mb-6">
            <img 
              src="/MyTrack-logo-main.svg" 
              alt="MyTrack" 
              className="h-20 xl:h-24 w-auto"
            />
          </div>
          <h2 className="font-gilroy-600 text-2xl xl:text-3xl mb-4">ДЕЛИТЕСЬ МУЗЫКОЙ</h2>
          <p className="font-gilroy-300 text-muted-foreground max-w-sm">
            Одна ссылка для всех платформ. Простая аналитика. Бесплатно навсегда.
          </p>
        </div>
      </div>
    </div>
  );
}
