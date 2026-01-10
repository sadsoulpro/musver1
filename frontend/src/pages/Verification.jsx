import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, useAuth } from "@/App";
import { toast } from "sonner";
import { 
  Music, BadgeCheck, BarChart3, Eye, Shield, Settings, LogOut,
  Clock, CheckCircle, XCircle, Send, Info, ToggleLeft, ToggleRight
} from "lucide-react";
import { motion } from "framer-motion";

export default function Verification() {
  const { user, logout, refreshUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [badgeLoading, setBadgeLoading] = useState(false);
  
  const [form, setForm] = useState({
    artist_name: "",
    social_links: "",
    description: ""
  });

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await api.get("/verification/status");
      setStatus(response.data);
    } catch (error) {
      toast.error("Не удалось загрузить статус верификации");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.artist_name.trim()) {
      toast.error("Введите имя артиста");
      return;
    }
    if (!form.social_links.trim()) {
      toast.error("Укажите ссылки на социальные сети");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Опишите, почему вы хотите получить верификацию");
      return;
    }
    
    setSubmitting(true);
    
    try {
      await api.post("/verification/request", form);
      toast.success("Заявка отправлена на рассмотрение");
      fetchStatus();
      setForm({ artist_name: "", social_links: "", description: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Не удалось отправить заявку");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleBadge = async () => {
    setBadgeLoading(true);
    try {
      const response = await api.put("/settings/verification-badge");
      toast.success(response.data.show_badge ? "Галочка включена" : "Галочка отключена");
      fetchStatus();
      if (refreshUser) {
        await refreshUser();
      }
    } catch (error) {
      toast.error("Не удалось изменить настройку");
    } finally {
      setBadgeLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const getStatusBadge = () => {
    if (status?.verified) {
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span className="text-green-400 font-medium">Верифицирован</span>
        </div>
      );
    }
    
    switch (status?.verification_status) {
      case "pending":
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <Clock className="w-5 h-5 text-yellow-500" />
            <span className="text-yellow-400 font-medium">На рассмотрении</span>
          </div>
        );
      case "rejected":
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-400 font-medium">Отклонено</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-500/10 border border-zinc-500/30 rounded-lg">
            <Info className="w-5 h-5 text-zinc-500" />
            <span className="text-zinc-400 font-medium">Не верифицирован</span>
          </div>
        );
    }
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
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-zinc-900/50 border-r border-white/5 p-6 hidden lg:flex flex-col">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Music className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-xl">MYTRACK</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          <Link 
            to="/multilinks" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <BarChart3 className="w-5 h-5" />
            Мультиссылки
          </Link>
          
          <Link 
            to="/analytics" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Eye className="w-5 h-5" />
            Аналитика
          </Link>
          
          {user?.role === "admin" && (
            <Link 
              to="/admin" 
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Shield className="w-5 h-5" />
              Админ-панель
            </Link>
          )}
          
          <Link 
            to="/settings" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="w-5 h-5" />
            Настройки
          </Link>
          
          <Link 
            to="/verification" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 text-foreground"
          >
            <BadgeCheck className="w-5 h-5" />
            Верификация
          </Link>
        </nav>
        
        <div className="pt-6 border-t border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-medium">{user?.username?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="font-medium truncate">{user?.username}</p>
                {user?.verified && user?.show_verification_badge !== false && (
                  <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Выйти
          </Button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="max-w-2xl mx-auto p-6 lg:p-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-display mb-2 flex items-center gap-2">
              <BadgeCheck className="w-7 h-7 text-primary" />
              Верификация
            </h1>
            <p className="text-muted-foreground">
              Получите галочку верификации рядом с вашим именем
            </p>
          </div>
          
          {/* Current Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 mb-6"
          >
            <h2 className="font-semibold mb-4">Текущий статус</h2>
            {getStatusBadge()}
            
            {status?.verified && (
              <p className="text-sm text-muted-foreground mt-4">
                Ваш аккаунт верифицирован. Галочка отображается рядом с именем артиста на публичных страницах.
              </p>
            )}
          </motion.div>
          
          {/* Badge Settings - only for verified users */}
          {status?.verified && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 mb-6"
            >
              <h2 className="font-semibold mb-4">Настройки галочки</h2>
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    {status?.show_badge !== false ? (
                      <ToggleRight className="w-5 h-5 text-primary" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Показывать галочку</p>
                    <p className="text-sm text-muted-foreground">
                      {status?.show_badge !== false 
                        ? "Галочка видна на публичных страницах" 
                        : "Галочка скрыта от других пользователей"
                      }
                    </p>
                  </div>
                </div>
                <Button
                  variant={status?.show_badge !== false ? "default" : "outline"}
                  onClick={toggleBadge}
                  disabled={badgeLoading}
                  className={status?.show_badge !== false ? "bg-primary hover:bg-primary/90" : ""}
                >
                  {badgeLoading ? "..." : status?.show_badge !== false ? "Отключить" : "Включить"}
                </Button>
              </div>
            </motion.div>
          )}
          
          {/* Pending Request Info */}
          {status?.pending_request && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl bg-yellow-500/5 border border-yellow-500/20 mb-6"
            >
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                Ваша заявка на рассмотрении
              </h2>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Имя артиста:</span> {status.pending_request.artist_name}</p>
                <p><span className="text-muted-foreground">Дата подачи:</span> {new Date(status.pending_request.created_at).toLocaleDateString('ru-RU')}</p>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Обычно рассмотрение занимает 1-3 рабочих дня. Вы получите уведомление о результате.
              </p>
            </motion.div>
          )}
          
          {/* Verification Form - only if not verified and no pending request */}
          {!status?.verified && !status?.pending_request && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
            >
              <h2 className="font-semibold mb-2">Подать заявку на верификацию</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Верификация подтверждает, что вы являетесь настоящим артистом или официальным представителем.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="artist_name">Имя артиста / название проекта</Label>
                  <Input
                    id="artist_name"
                    value={form.artist_name}
                    onChange={(e) => setForm(prev => ({ ...prev, artist_name: e.target.value }))}
                    placeholder="Например: DJ Shadow"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="social_links">Ссылки на социальные сети</Label>
                  <Textarea
                    id="social_links"
                    value={form.social_links}
                    onChange={(e) => setForm(prev => ({ ...prev, social_links: e.target.value }))}
                    placeholder="Instagram, VK, YouTube, Spotify и т.д. (по одной ссылке на строку)"
                    className="bg-zinc-800 border-zinc-700 min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Укажите ссылки на ваши официальные страницы для подтверждения личности
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Почему вы хотите получить верификацию?</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Расскажите о себе и своей деятельности..."
                    className="bg-zinc-800 border-zinc-700 min-h-[120px]"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {submitting ? (
                    "Отправка..."
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Отправить заявку
                    </>
                  )}
                </Button>
              </form>
            </motion.div>
          )}
          
          {/* Info about verification */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 p-6 rounded-2xl bg-zinc-900/30 border border-white/5"
          >
            <h3 className="font-semibold mb-3">Что даёт верификация?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <BadgeCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                Галочка верификации рядом с именем артиста на публичных страницах
              </li>
              <li className="flex items-start gap-2">
                <BadgeCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                Подтверждение подлинности вашего аккаунта
              </li>
              <li className="flex items-start gap-2">
                <BadgeCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                Повышение доверия у вашей аудитории
              </li>
            </ul>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
