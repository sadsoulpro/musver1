import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Music, ArrowLeft, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Недействительная ссылка для сброса пароля");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error("Пароль должен содержать минимум 6 символов");
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }
    
    setLoading(true);
    
    try {
      await axios.post(`${API_URL}/api/auth/reset-password`, {
        token,
        new_password: password
      });
      setSuccess(true);
      toast.success("Пароль успешно изменён!");
    } catch (err) {
      const message = err.response?.data?.detail || "Произошла ошибка";
      setError(message);
      toast.error(message);
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
            Вернуться к входу
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
            
            {error && !success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-3xl font-semibold mb-4">Ошибка</h1>
                <p className="text-muted-foreground mb-8">{error}</p>
                <Link to="/forgot-password">
                  <Button className="bg-primary hover:bg-primary/90 rounded-xl" data-testid="request-new-link-btn">
                    Запросить новую ссылку
                  </Button>
                </Link>
              </motion.div>
            ) : success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h1 className="text-3xl font-semibold mb-4">Пароль изменён</h1>
                <p className="text-muted-foreground mb-8">
                  Ваш пароль был успешно изменен. Войдите в свой аккаунт.
                </p>
                <Button 
                  onClick={() => navigate("/login")}
                  className="bg-primary hover:bg-primary/90 rounded-xl"
                  data-testid="go-to-login-btn"
                >
                  Перейти к входу
                </Button>
              </motion.div>
            ) : (
              <>
                <h1 className="text-3xl font-semibold mb-2">Новый пароль</h1>
                <p className="text-muted-foreground mb-8">
                  Введите новый пароль для вашей учётной записи
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="password">Новый пароль</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      data-testid="reset-password-input"
                      className="h-12 bg-zinc-900 border-zinc-800 focus:border-primary"
                    />
                    <p className="text-xs text-muted-foreground">Минимум 6 символов</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      data-testid="reset-confirm-password-input"
                      className="h-12 bg-zinc-900 border-zinc-800 focus:border-primary"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={loading}
                    data-testid="reset-submit-btn"
                    className="w-full h-12 bg-primary hover:bg-primary/90 rounded-xl font-semibold"
                  >
                    {loading ? "Сохранение..." : "Сохранить пароль"}
                  </Button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </div>
      
      {/* Right Side - Visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/20 via-zinc-900 to-background items-center justify-center p-12">
        <div className="text-center">
          <div className="w-32 h-32 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-16 h-16 text-primary" />
          </div>
          <h2 className="font-display text-4xl mb-4">БЕЗОПАСНОСТЬ</h2>
          <p className="text-muted-foreground max-w-sm">
            Создайте надёжный пароль для защиты вашей учётной записи.
          </p>
        </div>
      </div>
    </div>
  );
}
