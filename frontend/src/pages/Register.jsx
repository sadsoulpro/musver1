import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/App";
import { toast } from "sonner";
import { Music, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error("Пароль должен содержать минимум 6 символов");
      return;
    }
    
    setLoading(true);
    
    try {
      await register(email, username, password);
      toast.success("Аккаунт создан! Добро пожаловать в MyTrack!");
      navigate("/multilinks");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16">
        <div className="w-full max-w-md mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            На главную
          </Link>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <Link to="/"><span className="font-display text-2xl">MYTRACK</span></Link>
            </div>
            
            <h1 className="text-3xl font-semibold mb-2">Создайте аккаунт</h1>
            <p className="text-muted-foreground mb-8">
              Начните делиться музыкой за считанные минуты
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
                  data-testid="register-email-input"
                  className="h-12 bg-zinc-900 border-zinc-800 focus:border-primary"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">Имя пользователя</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  data-testid="register-username-input"
                  className="h-12 bg-zinc-900 border-zinc-800 focus:border-primary"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="register-password-input"
                  className="h-12 bg-zinc-900 border-zinc-800 focus:border-primary"
                />
                <p className="text-xs text-muted-foreground">Минимум 6 символов</p>
              </div>
              
              <Button 
                type="submit" 
                disabled={loading}
                data-testid="register-submit-btn"
                className="w-full h-12 bg-primary hover:bg-primary/90 rounded-xl font-semibold"
              >
                {loading ? "Создание аккаунта..." : "Создать аккаунт"}
              </Button>
            </form>
            
            <p className="mt-8 text-center text-muted-foreground">
              Уже есть аккаунт?{" "}
              <Link to="/login" className="text-primary hover:underline" data-testid="login-link">
                Войти
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
      
      {/* Right Side - Visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/20 via-zinc-900 to-background items-center justify-center p-12">
        <div className="text-center">
          <div className="w-32 h-32 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <Music className="w-16 h-16 text-primary" />
          </div>
          <h2 className="font-display text-4xl mb-4">ПРИСОЕДИНЯЙТЕСЬ К MYTRACK</h2>
          <p className="text-muted-foreground max-w-sm">
            Создавайте красивые страницы со смарт-ссылками для ваших релизов. Бесплатно.
          </p>
        </div>
      </div>
    </div>
  );
}
