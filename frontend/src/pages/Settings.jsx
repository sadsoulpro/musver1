import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, useAuth } from "@/App";
import { toast } from "sonner";
import { User, Mail, Lock, Trash2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";

export default function Settings() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  const [profileForm, setProfileForm] = useState({
    username: user?.username || "",
    email: user?.email || ""
  });
  const [profileLoading, setProfileLoading] = useState(false);
  
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileForm.username.trim()) { toast.error("Введите имя пользователя"); return; }
    if (!profileForm.email.trim()) { toast.error("Введите email"); return; }
    
    setProfileLoading(true);
    try {
      const response = await api.put("/settings/profile", { username: profileForm.username, email: profileForm.email });
      toast.success(response.data.message);
      if (refreshUser) await refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Не удалось обновить профиль");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordForm.current_password) { toast.error("Введите текущий пароль"); return; }
    if (passwordForm.new_password.length < 6) { toast.error("Минимум 6 символов"); return; }
    if (passwordForm.new_password !== passwordForm.confirm_password) { toast.error("Пароли не совпадают"); return; }
    
    setPasswordLoading(true);
    try {
      const response = await api.put("/settings/password", { current_password: passwordForm.current_password, new_password: passwordForm.new_password });
      toast.success(response.data.message);
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Не удалось изменить пароль");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "УДАЛИТЬ") { toast.error("Введите УДАЛИТЬ"); return; }
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

  return (
    <Sidebar>
      <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-10">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-display mb-2">Настройки</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Управление профилем и безопасностью</p>
        </div>
        
        {/* Profile Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="font-semibold text-sm sm:text-base">Профиль</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Изменить имя и email</p>
            </div>
          </div>
          
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm">Имя пользователя</Label>
              <Input id="username" value={profileForm.username} onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value }))} className="bg-zinc-800 border-zinc-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input id="email" type="email" value={profileForm.email} onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))} className="bg-zinc-800 border-zinc-700" />
            </div>
            <Button type="submit" disabled={profileLoading} className="w-full sm:w-auto bg-primary hover:bg-primary/90">
              {profileLoading ? "Сохранение..." : "Сохранить изменения"}
            </Button>
          </form>
        </motion.div>
        
        {/* Password Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-4 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="font-semibold text-sm sm:text-base">Безопасность</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Изменить пароль</p>
            </div>
          </div>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password" className="text-sm">Текущий пароль</Label>
              <Input id="current_password" type="password" value={passwordForm.current_password} onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))} className="bg-zinc-800 border-zinc-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password" className="text-sm">Новый пароль</Label>
              <Input id="new_password" type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))} className="bg-zinc-800 border-zinc-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password" className="text-sm">Подтвердите пароль</Label>
              <Input id="confirm_password" type="password" value={passwordForm.confirm_password} onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))} className="bg-zinc-800 border-zinc-700" />
            </div>
            <Button type="submit" disabled={passwordLoading} className="w-full sm:w-auto bg-primary hover:bg-primary/90">
              {passwordLoading ? "Изменение..." : "Изменить пароль"}
            </Button>
          </form>
        </motion.div>
        
        {/* Danger Zone */}
        {user?.role !== "admin" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-4 sm:p-6 rounded-2xl bg-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
              </div>
              <div>
                <h2 className="font-semibold text-sm sm:text-base text-red-400">Опасная зона</h2>
                <p className="text-xs sm:text-sm text-red-400/70">Удаление аккаунта необратимо</p>
              </div>
            </div>
            
            {!showDeleteConfirm ? (
              <Button variant="outline" onClick={() => setShowDeleteConfirm(true)} className="w-full sm:w-auto border-red-500/30 text-red-400 hover:bg-red-500/10">
                Удалить аккаунт
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="p-3 sm:p-4 bg-red-500/10 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-red-400">Все ваши страницы, ссылки и статистика будут удалены. Введите УДАЛИТЬ для подтверждения.</p>
                </div>
                <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="УДАЛИТЬ" className="bg-zinc-800 border-red-500/30" />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={handleDeleteAccount} disabled={deleteLoading} className="bg-red-500 hover:bg-red-600">
                    {deleteLoading ? "Удаление..." : "Подтвердить удаление"}
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}>
                    Отмена
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </Sidebar>
  );
}
