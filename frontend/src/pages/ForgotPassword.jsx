import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Music, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
      setSubmitted(true);
      toast.success("Инструкции отправлены на вашу почту");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Произошла ошибка");
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
            
            {!submitted ? (
              <>
                <h1 className="text-3xl font-semibold mb-2">Восстановление пароля</h1>
                <p className="text-muted-foreground mb-8">
                  Введите почту, указанную при регистрации. Мы отправим вам ссылку для сброса пароля.
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
                      className="h-12 bg-zinc-900 border-zinc-800 focus:border-primary"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={loading}
                    data-testid="forgot-submit-btn"
                    className="w-full h-12 bg-primary hover:bg-primary/90 rounded-xl font-semibold"
                  >
                    {loading ? "Отправка..." : "Восстановить пароль"}
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
                <h1 className="text-3xl font-semibold mb-4">Проверьте почту</h1>
                <p className="text-muted-foreground mb-8">
                  Мы отправили вам ссылку для сброса пароля на <span className="text-foreground font-medium">{email}</span>
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Не получили письмо? Проверьте папку «Спам» или попробуйте снова.
                </p>
                <Button 
                  variant="outline"
                  onClick={() => setSubmitted(false)}
                  className="rounded-xl"
                  data-testid="try-again-btn"
                >
                  Отправить снова
                </Button>
              </motion.div>
            )}
            
            <p className="mt-8 text-center text-muted-foreground">
              Вспомнили пароль?{" "}
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
            <Mail className="w-16 h-16 text-primary" />
          </div>
          <h2 className="font-display text-4xl mb-4">ВОССТАНОВИТЕ ДОСТУП</h2>
          <p className="text-muted-foreground max-w-sm">
            Забыли пароль?. Просто введите ваш email.
          </p>
        </div>
      </div>
    </div>
  );
}
