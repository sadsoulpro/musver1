import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth, api } from "@/App";
import { toast } from "sonner";
import { 
  BarChart3, Eye, Shield, Settings, LogOut, 
  BadgeCheck, Menu, X, HelpCircle, Globe, Palette, MessageCircle
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";

// Navigation items with translation keys
const getNavItems = (t) => [
  { path: "/multilinks", label: t('sidebar', 'myPages'), icon: BarChart3 },
  { path: "/random-cover", label: "RandomCover", icon: Palette },
  { path: "/analytics", label: t('sidebar', 'analytics'), icon: Eye },
  { path: "/domains", label: t('sidebar', 'domains'), icon: Globe },
  { path: "/settings", label: t('sidebar', 'settings'), icon: Settings },
  { path: "/verification", label: t('sidebar', 'verification'), icon: BadgeCheck },
  { path: "/support", label: t('sidebar', 'support'), icon: MessageCircle },
];

// Reusable navigation content
function NavContent({ currentPath, user, onLogout, onNavigate, unreadUserTickets, unreadStaffTickets }) {
  const isAdminRole = user?.role === "admin" || user?.role === "owner" || user?.role === "moderator";
  const { t } = useLanguage();
  const navItems = getNavItems(t);

  return (
    <>
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || 
            (item.path === "/multilinks" && currentPath === "/multilinks") ||
            (item.path === "/analytics" && currentPath.startsWith("/analytics"));
          
          // Show badge for support item
          const showUserBadge = item.path === "/support" && unreadUserTickets > 0;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive
                  ? "bg-white/5 text-foreground"
                  : "hover:bg-white/5 text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`nav-${item.path.replace("/", "")}`}
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {showUserBadge && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white animate-pulse">
                  {unreadUserTickets}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      
      <div className="pt-6 border-t border-white/5">
        {/* Language Switcher */}
        <div className="px-4 py-2 mb-2">
          <LanguageSwitcher variant="compact" className="w-full justify-start" />
        </div>
        
        {/* Admin Panel link - at bottom before user info */}
        {isAdminRole && (
          <Link
            to="/admin"
            onClick={onNavigate}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors mb-2 ${
              currentPath === "/admin"
                ? "bg-white/5 text-foreground"
                : "hover:bg-white/5 text-muted-foreground hover:text-foreground"
            }`}
            data-testid="nav-admin"
          >
            <Shield className="w-5 h-5" />
            <span className="flex-1">{t('sidebar', 'admin')}</span>
            {unreadStaffTickets > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white animate-pulse">
                {unreadStaffTickets}
              </span>
            )}
          </Link>
        )}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-semibold">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="font-medium truncate">{user?.username}</p>
              {user?.verified && user?.show_verification_badge !== false && (
                <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              {user?.plan && (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                  user.plan === 'pro' ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-300' :
                  'bg-zinc-700 text-zinc-400'
                }`}>
                  {user.plan === 'pro' ? 'PRO' : 'FREE'}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={onLogout}
          data-testid="logout-btn"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t('common', 'logout')}
        </Button>
      </div>
    </>
  );
}

// Mobile menu component
function MobileMenu({ user, onLogout, unreadUserTickets, unreadStaffTickets }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  
  const handleNavigate = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden relative"
          data-testid="mobile-menu-btn"
        >
          <Menu className="w-5 h-5" />
          {(unreadUserTickets > 0 || unreadStaffTickets > 0) && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="left" 
        className="w-72 bg-zinc-900 border-white/5 p-0"
      >
        <div className="flex flex-col h-full p-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-10">
            <img 
              src="/MyTrack-logo-main.svg" 
              alt="MyTrack" 
              className="h-8 w-auto"
            />
          </div>
          
          {/* Nav Content */}
          <NavContent 
            currentPath={location.pathname}
            user={user}
            onLogout={() => {
              setOpen(false);
              onLogout();
            }}
            onNavigate={handleNavigate}
            unreadUserTickets={unreadUserTickets}
            unreadStaffTickets={unreadStaffTickets}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Desktop Sidebar component
function DesktopSidebar({ user, onLogout, unreadUserTickets, unreadStaffTickets }) {
  const location = useLocation();
  
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-zinc-900/50 border-r border-white/5 p-6 hidden lg:flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <Link to="/multilinks">
          <img 
            src="/MyTrack-logo-main.svg" 
            alt="MyTrack" 
            className="h-8 w-auto"
          />
        </Link>
      </div>
      
      {/* Nav Content */}
      <NavContent 
        currentPath={location.pathname}
        user={user}
        onLogout={onLogout}
        onNavigate={() => {}}
        unreadUserTickets={unreadUserTickets}
        unreadStaffTickets={unreadStaffTickets}
      />
    </aside>
  );
}

// Mobile Header component
function MobileHeader({ user, onLogout, unreadUserTickets, unreadStaffTickets }) {
  return (
    <div className="flex items-center justify-between p-4 lg:hidden sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center gap-3">
        <MobileMenu 
          user={user} 
          onLogout={onLogout} 
          unreadUserTickets={unreadUserTickets}
          unreadStaffTickets={unreadStaffTickets}
        />
        <Link to="/multilinks">
          <img 
            src="/MyTrack-logo-main.svg" 
            alt="MyTrack" 
            className="h-6 w-auto"
          />
        </Link>
      </div>
    </div>
  );
}

// Main Sidebar component that exports all pieces
export default function Sidebar({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadUserTickets, setUnreadUserTickets] = useState(0);
  const [unreadStaffTickets, setUnreadStaffTickets] = useState(0);
  const prevStaffCountRef = useRef(0);
  
  const isStaff = user?.role === "admin" || user?.role === "owner" || user?.role === "moderator";

  // Fetch unread counts
  useEffect(() => {
    const fetchUnreadCounts = async () => {
      try {
        // Always fetch user unread tickets
        const userRes = await api.get("/tickets/user/unread-count");
        setUnreadUserTickets(userRes.data.unread_count);
        
        // Fetch staff unread if user is staff
        if (isStaff) {
          const staffRes = await api.get("/admin/tickets/unread-count");
          const newCount = staffRes.data.unread_count;
          
          // Show toast if new tickets arrived
          if (newCount > prevStaffCountRef.current && prevStaffCountRef.current > 0) {
            toast.info("Новое обращение в поддержку!", {
              description: "Проверьте раздел тикетов в админ-панели",
              duration: 5000
            });
          }
          
          prevStaffCountRef.current = newCount;
          setUnreadStaffTickets(newCount);
        }
      } catch (error) {
        // Silently fail
      }
    };

    fetchUnreadCounts();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCounts, 30000);
    
    return () => clearInterval(interval);
  }, [isStaff]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <DesktopSidebar 
        user={user} 
        onLogout={handleLogout}
        unreadUserTickets={unreadUserTickets}
        unreadStaffTickets={unreadStaffTickets}
      />
      
      {/* Mobile Header */}
      <MobileHeader 
        user={user} 
        onLogout={handleLogout}
        unreadUserTickets={unreadUserTickets}
        unreadStaffTickets={unreadStaffTickets}
      />
      
      {/* Main Content */}
      <main className="lg:ml-64">
        {children}
      </main>
    </div>
  );
}

// Export individual components for flexibility
export { MobileMenu, MobileHeader, DesktopSidebar, NavContent };
