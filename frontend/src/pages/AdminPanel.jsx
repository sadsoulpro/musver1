import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { api, useAuth } from "@/App";
import { toast } from "sonner";
import { 
  Music, Users, FileText, ArrowLeft, Shield, 
  Ban, Check, Eye, ExternalLink, BarChart3, LogOut
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, pagesRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/pages")
      ]);
      setUsers(usersRes.data);
      setPages(pagesRes.data);
    } catch (error) {
      toast.error("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  };

  const toggleUserBlock = async (userId) => {
    try {
      const response = await api.put(`/admin/users/${userId}/block`);
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error("Не удалось обновить пользователя");
    }
  };

  const togglePageStatus = async (pageId) => {
    try {
      const response = await api.put(`/admin/pages/${pageId}/disable`);
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error("Не удалось обновить страницу");
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
            to="/dashboard" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="nav-dashboard"
          >
            <BarChart3 className="w-5 h-5" />
            Панель
          </Link>
          
          <Link 
            to="/admin" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 text-foreground"
            data-testid="nav-admin"
          >
            <Shield className="w-5 h-5" />
            Админ-панель
          </Link>
        </nav>
        
        <div className="pt-6 border-t border-white/5">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => { logout(); window.location.href = '/'; }}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Выйти
          </Button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="lg:ml-64 p-6 lg:p-10">
        {/* Mobile Header */}
        <div className="flex items-center gap-4 mb-8 lg:hidden">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Админ-панель</h1>
        </div>
        
        {/* Header */}
        <div className="hidden lg:block mb-10">
          <h1 className="text-2xl font-semibold mb-1">Админ-панель</h1>
          <p className="text-muted-foreground">Управление пользователями и страницами</p>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-muted-foreground">Всего пользователей</span>
            </div>
            <p className="text-3xl font-semibold" data-testid="total-users">{users.length}</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-500" />
              </div>
              <span className="text-muted-foreground">Всего страниц</span>
            </div>
            <p className="text-3xl font-semibold" data-testid="total-pages">{pages.length}</p>
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-zinc-900 border border-white/5 mb-6">
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="w-4 h-4 mr-2" />
              Пользователи
            </TabsTrigger>
            <TabsTrigger value="pages" data-testid="tab-pages">
              <FileText className="w-4 h-4 mr-2" />
              Страницы
            </TabsTrigger>
          </TabsList>
          
          {/* Users Tab */}
          <TabsContent value="users">
            <div className="space-y-3">
              {users.map((user, i) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 flex items-center justify-between"
                  data-testid={`user-row-${user.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-primary font-semibold">
                        {user.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.username}</p>
                        {user.role === "admin" && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary">
                            Админ
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          user.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {user.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{user.page_count} страниц</p>
                      <p className="text-xs text-muted-foreground">план {user.plan}</p>
                    </div>
                    
                    {user.role !== "admin" && (
                      <Button
                        variant={user.status === "active" ? "destructive" : "default"}
                        size="sm"
                        onClick={() => toggleUserBlock(user.id)}
                        data-testid={`block-user-${user.id}`}
                      >
                        {user.status === "active" ? (
                          <>
                            <Ban className="w-4 h-4 mr-1" />
                            Заблокировать
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Разблокировать
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {users.length === 0 && (
                <p className="text-center text-muted-foreground py-10">Пользователи не найдены</p>
              )}
            </div>
          </TabsContent>
          
          {/* Pages Tab */}
          <TabsContent value="pages">
            <div className="space-y-3">
              {pages.map((page, i) => (
                <motion.div
                  key={page.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 flex items-center justify-between"
                  data-testid={`page-row-${page.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden">
                      {page.cover_image ? (
                        <img 
                          src={page.cover_image.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${page.cover_image}` : page.cover_image}
                          alt={page.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{page.title}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          page.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {page.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        by {page.user?.username || "Unknown"} • /{page.slug}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Eye className="w-4 h-4" /> {page.views || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">{page.total_clicks || 0} кликов</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                      
                      <Button
                        variant={page.status === "active" ? "destructive" : "default"}
                        size="sm"
                        onClick={() => togglePageStatus(page.id)}
                        data-testid={`toggle-page-${page.id}`}
                      >
                        {page.status === "active" ? "Отключить" : "Включить"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {pages.length === 0 && (
                <p className="text-center text-muted-foreground py-10">Страницы не найдены</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
