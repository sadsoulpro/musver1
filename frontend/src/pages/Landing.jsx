import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music, Link2, BarChart3, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-fuchsia-500/10 via-transparent to-purple-500/5 pointer-events-none" />
      
      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center">
            <Music className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <Link to="/"><span className="font-display text-xl sm:text-2xl tracking-tight">MYTRACK</span></Link>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <Link to="/login">
            <Button variant="ghost" data-testid="nav-login-btn" className="px-3 sm:px-4">Войти</Button>
          </Link>
          <Link to="/register">
            <Button data-testid="nav-signup-btn" className="bg-primary hover:bg-primary/90 rounded-full px-4 sm:px-6 text-sm sm:text-base">
              Начать
            </Button>
          </Link>
        </div>
      </nav>
      
      {/* Hero Section */}
      <section className="relative z-10 px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-32 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl tracking-tight leading-none mb-4 sm:mb-6">
              СОЗДАЙ<br />
              <span className="text-primary">МУЛЬТИССЫЛКУ</span><br />
              ДЛЯ СВОЕЙ <span className="text-primary">МУЗЫКИ</span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg mb-6 sm:mb-8 max-w-md">
              Стильные страницы для ваших релизов. Одна ссылка — все платформы.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link to="/register">
                <Button 
                  data-testid="hero-get-started-btn"
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 rounded-full px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-105"
                >
                  Создать страницу
                </Button>
              </Link>
              <Link to="/demo">
                <Button 
                  variant="outline" 
                  data-testid="hero-demo-btn"
                  className="w-full sm:w-auto rounded-full px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg border-white/10 hover:bg-white/5"
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
            className="relative hidden lg:block"
          >
            <div className="relative mx-auto w-[280px]">
              {/* Phone Frame */}
              <div className="rounded-[40px] border-4 border-zinc-800 bg-zinc-900 p-2 shadow-2xl">
                <div className="rounded-[32px] overflow-hidden bg-gradient-to-b from-purple-900/50 to-zinc-900 aspect-[9/16]">
                  {/* Mock Content */}
                  <div className="p-6 pt-12 flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 mb-4" />
                    <h3 className="font-display text-xl">Artist Name</h3>
                    <p className="text-sm text-muted-foreground mb-6">Song Name</p>
                    
                    <div className="w-full space-y-3">
                      {["Apple Music", "Spotify", "YouTube"].map((platform, i) => (
                        <div 
                          key={platform}
                          className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-sm font-medium"
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
      </section>
      
      {/* Features Section */}
      <section className="relative z-10 px-4 sm:px-6 py-12 sm:py-20 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl mb-3 sm:mb-4">ВСЁ ЧТО НУЖНО</h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto px-4">
              Простые инструменты для продвижения музыки и роста аудитории
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
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
                className="p-6 rounded-2xl bg-zinc-800/50 border border-white/5 hover:border-primary/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="relative z-10 px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl mb-4 sm:mb-6">
            НАЧНИ ДЕЛИТЬСЯ<br />МУЗЫКОЙ СЕГОДНЯ
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg mb-6 sm:mb-8 px-4">
            Присоединяйтесь к тысячам артистов, использующих MyTrack.
          </p>
          <Link to="/register">
            <Button 
              data-testid="cta-get-started-btn"
              className="bg-primary hover:bg-primary/90 rounded-full px-8 sm:px-10 py-5 sm:py-6 text-base sm:text-lg font-semibold"
            >
              Начать бесплатно
            </Button>
          </Link>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="relative z-10 px-4 sm:px-6 py-6 sm:py-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Music className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-lg">MYTRACK</span>
          </div>
          <p className="text-muted-foreground text-sm text-center sm:text-left">© 2026 MyTrack. Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
}
