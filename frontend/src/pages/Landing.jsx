import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Link2, BarChart3, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/App";

export default function Landing() {
  const { user, isAuthenticated } = useAuth();
  
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-fuchsia-500/10 via-transparent to-purple-500/5 pointer-events-none" />
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 lg:px-10 py-3 sm:py-4 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Link to="/">
            <img 
              src="/MyTrack-logo-main.svg" 
              alt="MyTrack" 
              className="h-7 sm:h-8 lg:h-10 w-auto"
            />
          </Link>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Link to={user?.role === 'admin' ? '/admin' : '/multilinks'}>
                <Button variant="ghost" data-testid="nav-panel-btn" className="px-3 sm:px-4 text-sm font-gilroy-600">Панель</Button>
              </Link>
              <Link to="/page/new">
                <Button data-testid="nav-create-btn" className="bg-primary hover:bg-primary/90 rounded-full px-4 sm:px-5 py-2 text-sm font-gilroy-600">
                  Создать
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" data-testid="nav-login-btn" className="px-3 sm:px-4 text-sm font-gilroy-600">Войти</Button>
              </Link>
              <Link to="/register">
                <Button data-testid="nav-signup-btn" className="bg-primary hover:bg-primary/90 rounded-full px-4 sm:px-5 py-2 text-sm font-gilroy-600">
                  Начать
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>
      
      {/* Hero Section - Full Screen */}
      <section className="relative z-10 min-h-screen flex items-center px-4 sm:px-6 lg:px-10">
        <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-6 lg:gap-12 xl:gap-16 items-center pt-16 sm:pt-20 pb-8 lg:pt-0 lg:pb-0">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            {/* Mobile-optimized heading */}
            <h1 className="font-gilroy-800 leading-[1.05] mb-4 sm:mb-5 lg:mb-6
              text-[2rem] sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
              СОЗДАЙ<br />
              <span className="text-primary">МУЛЬТИССЫЛКУ</span><br />
              ДЛЯ СВОЕЙ <span className="text-primary">МУЗЫКИ</span>
            </h1>
            <p className="font-gilroy-300 text-muted-foreground max-w-md mx-auto lg:mx-0
              text-sm sm:text-base lg:text-lg lg:mb-8">
              Стильные страницы для ваших релизов. Одна ссылка — все платформы.
            </p>
            {/* Desktop buttons - hidden on mobile/tablet */}
            <div className="hidden lg:flex flex-row gap-3 justify-start">
              <Link to={isAuthenticated ? "/page/new" : "/register"}>
                <Button 
                  data-testid="hero-get-started-btn"
                  className="bg-primary hover:bg-primary/90 rounded-full px-8 py-5 text-base font-gilroy-600 shadow-lg shadow-primary/20 transition-all hover:scale-105"
                >
                  Создать страницу
                </Button>
              </Link>
              <Link to="/demo">
                <Button 
                  variant="outline" 
                  data-testid="hero-demo-btn"
                  className="rounded-full px-8 py-5 text-base font-gilroy-600 border-white/10 hover:bg-white/5"
                >
                  Демо
                </Button>
              </Link>
            </div>
          </motion.div>
          
          {/* Hero Visual - Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative flex justify-center"
          >
            <div className="relative w-[200px] sm:w-[240px] lg:w-[280px] xl:w-[300px]">
              {/* Phone Frame */}
              <div className="rounded-[28px] sm:rounded-[36px] lg:rounded-[40px] border-[3px] sm:border-4 border-zinc-800 bg-zinc-900 p-1.5 sm:p-2 shadow-2xl">
                <div className="rounded-[22px] sm:rounded-[28px] lg:rounded-[32px] overflow-hidden bg-gradient-to-b from-purple-900/50 to-zinc-900 aspect-[9/16]">
                  {/* Mock Content */}
                  <div className="p-4 sm:p-5 lg:p-6 pt-8 sm:pt-10 lg:pt-12 flex flex-col items-center text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-lg sm:rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 mb-3 sm:mb-4" />
                    <h3 className="font-gilroy-600 text-sm sm:text-base lg:text-lg">Artist Name</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground font-gilroy-300 mb-4 sm:mb-5 lg:mb-6">Song Name</p>
                    
                    <div className="w-full space-y-2 sm:space-y-2.5 lg:space-y-3">
                      {["Apple Music", "Spotify", "YouTube"].map((platform) => (
                        <div 
                          key={platform}
                          className="w-full py-2 sm:py-2.5 lg:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm font-gilroy-600"
                        >
                          {platform}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Glow Effect */}
              <div className="absolute -inset-4 bg-primary/20 blur-3xl -z-10 rounded-full" />
            </div>
          </motion.div>
        </div>
        
        {/* Scroll indicator - hidden on mobile */}
        <motion.div 
          className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 hidden sm:block"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-5 h-8 sm:w-6 sm:h-10 rounded-full border-2 border-white/20 flex justify-center pt-1.5 sm:pt-2">
            <div className="w-1 h-1.5 sm:h-2 rounded-full bg-white/40" />
          </div>
        </motion.div>
      </section>
      
      {/* Features Section */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-10 py-12 sm:py-16 lg:py-24 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="font-gilroy-600 mb-2 sm:mb-3 lg:mb-4
              text-xl sm:text-2xl md:text-3xl lg:text-4xl">
              ВСЁ ЧТО НУЖНО
            </h2>
            <p className="font-gilroy-300 text-muted-foreground max-w-md mx-auto px-2
              text-xs sm:text-sm lg:text-base">
              Простые инструменты для продвижения музыки и роста аудитории
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            {[
              {
                icon: Link2,
                title: "Умные ссылки",
                description: "Одна ссылка для всех платформ. Spotify, Apple Music, YouTube и другие."
              },
              {
                icon: BarChart3,
                title: "Аналитика",
                description: "Отслеживайте просмотры и клики. Узнайте откуда приходят ваши фанаты."
              },
              {
                icon: Zap,
                title: "Быстрый старт",
                description: "Создайте страницу за минуты. Без программирования."
              }
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="p-5 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl bg-zinc-800/50 border border-white/5 hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center mb-3 sm:mb-4 lg:mb-5">
                  <feature.icon className="w-5 h-5 sm:w-5.5 sm:h-5.5 lg:w-6 lg:h-6 text-primary" />
                </div>
                <h3 className="font-gilroy-600 mb-1.5 sm:mb-2
                  text-base sm:text-lg">{feature.title}</h3>
                <p className="font-gilroy-300 text-muted-foreground
                  text-xs sm:text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-10 py-12 sm:py-16 lg:py-24">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="font-gilroy-600 mb-3 sm:mb-4 lg:mb-6 leading-tight
              text-xl sm:text-2xl md:text-3xl lg:text-4xl">
              НАЧНИ ДЕЛИТЬСЯ<br />МУЗЫКОЙ СЕГОДНЯ
            </h2>
            <p className="font-gilroy-300 text-muted-foreground mb-5 sm:mb-6 lg:mb-8 px-4
              text-xs sm:text-sm lg:text-base">
              Присоединяйтесь к тысячам артистов, использующих MyTrack.
            </p>
            <Link to="/register">
              <Button 
                data-testid="cta-get-started-btn"
                className="bg-primary hover:bg-primary/90 rounded-full px-6 sm:px-8 lg:px-10 py-4 sm:py-5 text-sm sm:text-base font-gilroy-600 shadow-lg shadow-primary/20 transition-all hover:scale-105"
              >
                Начать бесплатно
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="relative z-10 px-4 sm:px-6 lg:px-10 py-5 sm:py-6 lg:py-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center">
            <img 
              src="/MyTrack-logo-main.svg" 
              alt="MyTrack" 
              className="h-5 sm:h-6 lg:h-7 w-auto"
            />
          </div>
          <p className="font-gilroy-300 text-muted-foreground text-center sm:text-left
            text-xs sm:text-sm">
            © 2026 MyTrack. Все права защищены.
          </p>
        </div>
      </footer>
    </div>
  );
}
