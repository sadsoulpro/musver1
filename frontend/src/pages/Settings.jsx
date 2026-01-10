import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, useAuth } from "@/App";
import { toast } from "sonner";
import { 
  Music, Settings as SettingsIcon, User, Mail, Lock, Trash2, 
  BarChart3, Eye, Shield, LogOut, AlertTriangle
} from "lucide-react";
import { motion } from "framer-motion";

export default function Settings() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    username: user?.username || "",
    email: user?.email || ""
  });
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    if (!profileForm.username.trim()) {
      toast.error("Введите имя пользователя");
      return;
    }
    
    if (!profileForm.email.trim()) {
      toast.error("Введите email");
      return;
    }
    
    setProfileLoading(true);
    
    try {
      const response = await api.put("/settings/profile", {
        username: profileForm.username,
        email: profileForm.email
      });
      
      toast.success(response.data.message);
      
      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Не удалось обновить профиль");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!passwordForm.current_password) {
      toast.error("Введите текущий пароль");
      return;
    }
    
    if (passwordForm.new_password.length < 6) {
      toast.error("Новый пароль должен содержать минимум 6 символов");
      return;
    }
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("Пароли не совпадают");
      return;
    }
    
    setPasswordLoading(true);
    
    try {
      const response = await api.put("/settings/password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      
      toast.success(response.data.message);
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Не удалось изменить пароль");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "УДАЛИТЬ") {
      toast.error("Введите УДАЛИТЬ для подтверждения");
      return;
    }
    
    setDeleteLoading(true);
    
    try {
      await api.delete("/settings/account");
      toast.success("Аккаунт удалён");
      logout();
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Не удалось удалить аккаунт");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

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
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 text-foreground"
          >
            <SettingsIcon className="w-5 h-5" />
            Настройки
          </Link>
        </nav>
        
        <div className="pt-6 border-t border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-medium">{user?.username?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.username}</p>
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
            <h1 className="text-2xl font-display mb-2">Настройки</h1>
            <p className="text-muted-foreground">Управление профилем и безопасностью</p>
          </div>
          
          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 mb-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="font-semibold">Профиль</h2>
                <p className="text-sm text-muted-foreground">Изменить имя и email</p>
              </div>
            </div>
            
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Имя пользователя</Label>
                <Input
                  id="username"
                  value={profileForm.username}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Введите имя"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Введите email"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={profileLoading}
                className="bg-primary hover:bg-primary/90"
              >
                {profileLoading ? "Сохранение..." : "Сохранить изменения"}
              </Button>
            </form>
          </motion.div>
          
          {/* Password Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 mb-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h2 className="font-semibold">Пароль</h2>
                <p className="text-sm text-muted-foreground">Изменить пароль для входа</p>
              </div>
            </div>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current_password">Текущий пароль</Label>
                <Input
                  id="current_password"
                  type="password"
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                  placeholder="Введите текущий пароль"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new_password">Новый пароль</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                  placeholder="Минимум 6 символов"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Подтвердите пароль</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                  placeholder="Повторите новый пароль"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={passwordLoading}
                className="bg-primary hover:bg-primary/90"
              >
                {passwordLoading ? "Изменение..." : "Изменить пароль"}
              </Button>
            </form>
          </motion.div>
          
          {/* Delete Account Section - not for admins */}
          {user?.role !== "admin" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl bg-red-950/30 border border-red-500/20"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-red-400">Удаление аккаунта</h2>
                  <p className="text-sm text-red-400/70">Это действие нельзя отменить</p>
                </div>
              </div>
              
              {!showDeleteConfirm ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    При удалении аккаунта будут безвозвратно удалены все ваши страницы, ссылки и статистика.
                  </p>
                  <Button 
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Удалить аккаунт
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-red-500/10 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-400">Вы уверены?</p>
                      <p className="text-sm text-red-400/70">
                        Введите УДАЛИТЬ для подтверждения удаления аккаунта.
                      </p>
                    </div>
                  </div>
                  
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Введите УДАЛИТЬ"
                    className="bg-zinc-800 border-red-500/30"
                  />
                  
                  <div className="flex gap-3">
                    <Button 
                      variant="ghost"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText("");
                      }}
                    >
                      Отмена
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading || deleteConfirmText !== "УДАЛИТЬ"}
                    >
                      {deleteLoading ? "Удаление..." : "Подтвердить удаление"}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
          
          {/* Admin notice */}
          {user?.role === "admin" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <h2 className="font-semibold">Аккаунт администратора</h2>
                  <p className="text-sm text-muted-foreground">
                    Удаление аккаунта администратора недоступно из соображений безопасности
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
