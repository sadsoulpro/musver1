import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { api, useAuth } from "@/App";
import { toast } from "sonner";
import { 
  Music, Plus, Eye, MousePointer, ExternalLink, 
  MoreVertical, Trash2, Edit, BarChart3, Copy, Globe
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";

export default function Dashboard() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [siteMode, setSiteMode] = useState(false);
  const [siteModeLoading, setSiteModeLoading] = useState(false);
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    fetchPages();
    // Initialize site mode from user settings
    if (user?.site_navigation_enabled) {
      setSiteMode(true);
    }
  }, [user]);

  const fetchPages = async () => {
    try {
      const response = await api.get("/pages");
      setPages(response.data);
    } catch (error) {
      toast.error("Не удалось загрузить страницы");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pageId) => {
    if (!window.confirm("Вы уверены, что хотите удалить эту страницу?")) return;
    
    try {
      await api.delete(`/pages/${pageId}`);
      toast.success("Страница удалена");
      fetchPages();
    } catch (error) {
      toast.error("Не удалось удалить страницу");
    }
  };

  const copyLink = (slug) => {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Ссылка скопирована");
  };

  const toggleSiteMode = async () => {
    setSiteModeLoading(true);
    try {
      const response = await api.put("/settings/site-navigation", { enabled: !siteMode });
      setSiteMode(response.data.enabled);
      if (refreshUser) await refreshUser();
      toast.success(response.data.enabled ? "Режим сайта включён" : "Режим сайта выключен");
    } catch (error) {
      toast.error("Не удалось изменить настройку");
    } finally {
      setSiteModeLoading(false);
    }
  };

  const totalViews = pages.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalClicks = pages.reduce((sum, p) => sum + (p.total_clicks || 0), 0);

  return (
    <Sidebar>
      <div className="p-4 sm:p-6 lg:p-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-10">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold mb-1">С возвращением, {user?.username}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Управляйте вашими страницами</p>
          </div>
          <Link to="/page/new">
            <Button data-testid="create-page-btn" className="w-full sm:w-auto bg-primary hover:bg-primary/90 rounded-full px-6">
              <Plus className="w-4 h-4 mr-2" />
              Создать страницу
            </Button>
          </Link>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <span className="text-sm sm:text-base text-muted-foreground">Всего просмотров</span>
            </div>
            <p className="text-2xl sm:text-3xl font-semibold" data-testid="total-views">{totalViews.toLocaleString()}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <MousePointer className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              </div>
              <span className="text-sm sm:text-base text-muted-foreground">Всего кликов</span>
            </div>
            <p className="text-2xl sm:text-3xl font-semibold" data-testid="total-clicks">{totalClicks.toLocaleString()}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Music className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              </div>
              <span className="text-sm sm:text-base text-muted-foreground">Всего страниц</span>
            </div>
            <p className="text-2xl sm:text-3xl font-semibold" data-testid="total-pages">{pages.length}</p>
          </motion.div>
        </div>
        
        {/* Pages List */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Ваши страницы</h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            </div>
          ) : pages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 rounded-2xl border border-dashed border-white/10"
            >
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Страниц пока нет</h3>
              <p className="text-muted-foreground mb-6">Создайте свою первую страницу</p>
              <Link to="/page/new">
                <Button className="bg-primary hover:bg-primary/90 rounded-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Создать страницу
                </Button>
              </Link>
            </motion.div>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {pages.map((page, i) => (
                <motion.div
                  key={page.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors w-full overflow-hidden"
                  data-testid={`page-card-${page.id}`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Cover Image */}
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg sm:rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
                      {page.cover_image ? (
                        <img 
                          src={page.cover_image.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${page.cover_image}` : page.cover_image} 
                          alt={page.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{page.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate mb-1 sm:mb-2">
                        {page.artist_name} • {page.release_title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                          {page.views || 0}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MousePointer className="w-3 h-3 sm:w-4 sm:h-4" />
                          {page.total_clicks || 0}
                        </span>
                        <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${
                          page.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {page.status}
                        </span>
                      </div>
                    </div>
                    
                    {/* Actions - Responsive */}
                    <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 flex-shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9"
                        onClick={() => copyLink(page.slug)}
                        data-testid={`copy-link-${page.id}`}
                      >
                        <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                      <a 
                        href={`/${page.slug}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hidden xs:block"
                      >
                        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" data-testid={`view-page-${page.id}`}>
                          <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                      </a>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" data-testid={`page-menu-${page.id}`}>
                            <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                          <DropdownMenuItem asChild className="xs:hidden">
                            <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                              <ExternalLink className="w-4 h-4" />
                              Открыть страницу
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/page/${page.id}/edit`} className="flex items-center gap-2">
                              <Edit className="w-4 h-4" />
                              Редактировать
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/analytics/${page.id}`} className="flex items-center gap-2">
                              <BarChart3 className="w-4 h-4" />
                              Аналитика
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(page.id)}
                            className="text-red-400 focus:text-red-400"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Sidebar>
  );
}
