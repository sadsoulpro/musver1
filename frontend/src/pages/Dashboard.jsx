import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { api, useAuth } from "@/App";
import { toast } from "sonner";
import { 
  Music, Plus, Eye, MousePointer, ExternalLink, 
  MoreVertical, Trash2, Edit, BarChart3, LogOut,
  Settings, Copy
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const response = await api.get("/pages");
      setPages(response.data);
    } catch (error) {
      toast.error("Failed to load pages");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pageId) => {
    if (!window.confirm("Are you sure you want to delete this page?")) return;
    
    try {
      await api.delete(`/pages/${pageId}`);
      toast.success("Page deleted");
      fetchPages();
    } catch (error) {
      toast.error("Failed to delete page");
    }
  };

  const copyLink = (slug) => {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const totalViews = pages.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalClicks = pages.reduce((sum, p) => sum + (p.total_clicks || 0), 0);

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
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 text-foreground"
            data-testid="nav-dashboard"
          >
            <BarChart3 className="w-5 h-5" />
            Dashboard
          </Link>
          
          {user?.role === "admin" && (
            <Link 
              to="/admin" 
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
              data-testid="nav-admin"
            >
              <Settings className="w-5 h-5" />
              Admin Panel
            </Link>
          )}
        </nav>
        
        <div className="pt-6 border-t border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-semibold">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.username}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log out
          </Button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="lg:ml-64 p-6 lg:p-10">
        {/* Mobile Header */}
        <div className="flex items-center justify-between mb-8 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Music className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-lg">MYTRACK.CC</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Welcome back, {user?.username}</h1>
            <p className="text-muted-foreground">Manage your smart link pages</p>
          </div>
          <Link to="/page/new">
            <Button data-testid="create-page-btn" className="bg-primary hover:bg-primary/90 rounded-full px-6">
              <Plus className="w-4 h-4 mr-2" />
              Create Page
            </Button>
          </Link>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <span className="text-muted-foreground">Total Views</span>
            </div>
            <p className="text-3xl font-semibold" data-testid="total-views">{totalViews.toLocaleString()}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <MousePointer className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-muted-foreground">Total Clicks</span>
            </div>
            <p className="text-3xl font-semibold" data-testid="total-clicks">{totalClicks.toLocaleString()}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Music className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-muted-foreground">Total Pages</span>
            </div>
            <p className="text-3xl font-semibold" data-testid="total-pages">{pages.length}</p>
          </motion.div>
        </div>
        
        {/* Pages List */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Your Pages</h2>
          
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
              <h3 className="font-semibold mb-2">No pages yet</h3>
              <p className="text-muted-foreground mb-6">Create your first smart link page</p>
              <Link to="/page/new">
                <Button className="bg-primary hover:bg-primary/90 rounded-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Page
                </Button>
              </Link>
            </motion.div>
          ) : (
            <div className="grid gap-4">
              {pages.map((page, i) => (
                <motion.div
                  key={page.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 sm:p-6 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors"
                  data-testid={`page-card-${page.id}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Cover Image */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
                      {page.cover_image ? (
                        <img 
                          src={page.cover_image.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${page.cover_image}` : page.cover_image} 
                          alt={page.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{page.title}</h3>
                      <p className="text-sm text-muted-foreground truncate mb-2">
                        {page.artist_name} • {page.release_title}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Eye className="w-4 h-4" />
                          {page.views || 0}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MousePointer className="w-4 h-4" />
                          {page.total_clicks || 0}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          page.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {page.status}
                        </span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => copyLink(page.slug)}
                        data-testid={`copy-link-${page.id}`}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <a 
                        href={`/${page.slug}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="icon" data-testid={`view-page-${page.id}`}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`page-menu-${page.id}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                          <DropdownMenuItem asChild>
                            <Link to={`/page/${page.id}/edit`} className="flex items-center gap-2">
                              <Edit className="w-4 h-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/analytics/${page.id}`} className="flex items-center gap-2">
                              <BarChart3 className="w-4 h-4" />
                              Analytics
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(page.id)}
                            className="text-red-400 focus:text-red-400"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
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
      </main>
    </div>
  );
}
