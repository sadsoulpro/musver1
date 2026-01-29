import { Link } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Music2, Link2, BarChart3, Palette, QrCode, Zap, 
  ChevronDown, ArrowRight, Sparkles, Globe, Check
} from "lucide-react";
import { FaSpotify, FaApple, FaYoutube } from "react-icons/fa";
import { motion } from "framer-motion";
import { useAuth } from "@/App";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import MuslinkLogo from "@/components/MuslinkLogo";
import ProFeatureModal from "@/components/ProFeatureModal";

// Deezer icon component
const DeezerIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M6.01 11.75H0V15h6.01v-3.25zM6.01 7.25H0v3.25h6.01V7.25zM6.01 16.25H0v3.25h6.01v-3.25zM12.005 11.75H6.01V15h5.995v-3.25zM12.005 16.25H6.01v3.25h5.995v-3.25zM17.995 11.75H12V15h5.995v-3.25zM17.995 16.25H12v3.25h5.995v-3.25zM17.995 7.25H12v3.25h5.995V7.25zM24 11.75h-6.005V15H24v-3.25zM24 16.25h-6.005v3.25H24v-3.25zM24 7.25h-6.005v3.25H24V7.25zM24 2.75h-6.005V6H24V2.75z"/>
  </svg>
);

// YouTube Music icon component
const YouTubeMusicIcon = (props) => (
  <img src="/icons/youtube-music.svg" alt="YouTube Music" {...props} style={{ width: '1.2em', height: '1.2em', ...props.style }} />
);

// Accordion component for FAQ
function FAQItem({ question, answer, isOpen, onClick }) {
  return (
    <div className="border-b border-border/50">
      <button
        onClick={onClick}
        className="w-full py-5 flex items-center justify-between text-left hover:text-primary transition-colors"
      >
        <span className="font-semibold pr-4">{question}</span>
        <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <p className="pb-5 text-muted-foreground">{answer}</p>
      </motion.div>
    </div>
  );
}

export default function Landing() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [openFAQ, setOpenFAQ] = useState(0);
  const [proModalOpen, setProModalOpen] = useState(false);
  const [proFeatureName, setProFeatureName] = useState("");

  const handleProFeatureClick = (featureName) => {
    setProFeatureName(featureName);
    setProModalOpen(true);
  };

  const features = [
    {
      icon: Globe,
      title: t('newLanding', 'feature1Title'),
      description: t('newLanding', 'feature1Desc'),
    },
    {
      icon: Link2,
      title: t('newLanding', 'feature2Title'),
      description: t('newLanding', 'feature2Desc'),
    },
    {
      icon: BarChart3,
      title: t('newLanding', 'feature3Title'),
      description: t('newLanding', 'feature3Desc'),
      tag: t('newLanding', 'feature3Tag'),
      isPro: true,
    },
    {
      icon: Palette,
      title: t('newLanding', 'feature4Title'),
      description: t('newLanding', 'feature4Desc'),
      tag: t('newLanding', 'feature4Tag'),
      isPro: true,
    },
    {
      icon: QrCode,
      title: t('newLanding', 'feature5Title'),
      description: t('newLanding', 'feature5Desc'),
    },
    {
      icon: Zap,
      title: t('newLanding', 'feature6Title'),
      description: t('newLanding', 'feature6Desc'),
    },
  ];

  const steps = [
    {
      num: "01",
      title: t('newLanding', 'step1Title'),
      desc: t('newLanding', 'step1Desc'),
    },
    {
      num: "02",
      title: t('newLanding', 'step2Title'),
      desc: t('newLanding', 'step2Desc'),
    },
    {
      num: "03",
      title: t('newLanding', 'step3Title'),
      desc: t('newLanding', 'step3Desc'),
    },
  ];

  const faqs = [
    { q: t('newLanding', 'faq1Q'), a: t('newLanding', 'faq1A') },
    { q: t('newLanding', 'faq2Q'), a: t('newLanding', 'faq2A') },
    { q: t('newLanding', 'faq3Q'), a: t('newLanding', 'faq3A') },
    { q: t('newLanding', 'faq4Q'), a: t('newLanding', 'faq4A') },
  ];
  
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute inset-0 ${theme === 'dark' 
          ? 'bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5' 
          : 'bg-gradient-to-br from-primary/3 via-transparent to-purple-500/3'}`} 
        />
      </div>
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center">
              <MuslinkLogo height={28} theme={theme} />
            </Link>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <LanguageSwitcher variant="compact" dropDirection="down" />
              {isAuthenticated ? (
                <Link to={user?.role === 'admin' || user?.role === 'owner' ? '/admin' : '/multilinks'}>
                  <Button size="sm" data-testid="nav-panel-btn" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
                    {t('nav', 'panel')}
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/login">
                    <Button size="sm" data-testid="nav-login-btn" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
                      {t('nav', 'login')}
                    </Button>
                  </Link>
                  <Link to="/register" className="hidden sm:block">
                    <Button size="sm" data-testid="nav-signup-btn" variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
                      {t('nav', 'register')}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                <span>Smart Links for Musicians</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-tight mb-6">
                {t('newLanding', 'heroTitle')}
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
                {t('newLanding', 'heroSubtitle')}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to={isAuthenticated ? "/page/new" : "/register"}>
                  <Button 
                    size="lg" 
                    data-testid="hero-cta-btn"
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-lg px-8 py-6 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-0.5"
                  >
                    {t('newLanding', 'ctaCreate')}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link to="/demo">
                  <Button 
                    variant="outline" 
                    size="lg"
                    data-testid="hero-demo-btn"
                    className="w-full sm:w-auto text-lg px-8 py-6 rounded-xl"
                  >
                    {t('newLanding', 'ctaDemo')}
                  </Button>
                </Link>
              </div>
            </motion.div>
            
            {/* Phone Mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative flex justify-center lg:justify-end"
            >
              <div className="relative w-[260px] sm:w-[300px] lg:w-[320px]">
                {/* Phone frame */}
                <div className={`rounded-[3rem] p-3 shadow-2xl ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-100 border-gray-200'} border-4`}>
                  <div className={`rounded-[2.5rem] overflow-hidden ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'}`}>
                    {/* Notch */}
                    <div className="flex justify-center pt-2 pb-4">
                      <div className={`w-24 h-6 rounded-full ${theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-200'}`} />
                    </div>
                    
                    {/* Content */}
                    <div className="px-5 pb-8">
                      {/* Cover */}
                      <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary to-purple-600 mb-4 flex items-center justify-center shadow-lg">
                        <Music2 className="w-16 h-16 text-white/80" />
                      </div>
                      
                      {/* Info */}
                      <div className="text-center mb-5">
                        <h3 className="font-bold text-lg">Artist Name</h3>
                        <p className="text-sm text-muted-foreground">Track Title</p>
                      </div>
                      
                      {/* Buttons */}
                      <div className="space-y-2.5">
                        {[
                          { name: 'Spotify', color: '#1DB954', icon: FaSpotify },
                          { name: 'Apple Music', color: '#FA233B', icon: FaApple },
                          { name: 'YouTube Music', color: '#FF0000', icon: YouTubeMusicIcon, isImage: true },
                        ].map((platform, i) => (
                          <div 
                            key={platform.name}
                            className={`group w-full py-3 px-4 rounded-xl text-sm font-medium flex items-center justify-between transition-all duration-200 cursor-pointer ${
                              theme === 'dark' 
                                ? 'bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-primary/50' 
                                : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                                style={{ backgroundColor: platform.color }}
                              >
                                {platform.isImage ? (
                                  <platform.icon style={{ width: '20px', height: '20px' }} />
                                ) : (
                                  <platform.icon className="w-5 h-5 text-white" />
                                )}
                              </div>
                              <span className="font-medium">{platform.name}</span>
                            </div>
                            <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              {t('common', 'listen')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Glow */}
                <div className="absolute -inset-8 bg-primary/20 blur-3xl -z-10 rounded-full opacity-60" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className={`py-20 sm:py-32 px-4 sm:px-6 lg:px-8 ${theme === 'dark' ? 'bg-zinc-900/50' : 'bg-gray-50/80'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t('newLanding', 'featuresTitle')}
            </h2>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                onClick={() => feature.isPro && handleProFeatureClick(feature.title)}
                className={`group p-6 rounded-2xl transition-all duration-300 ${
                  theme === 'dark' 
                    ? 'bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 hover:border-primary/30' 
                    : 'bg-white hover:bg-white border border-gray-200 hover:border-primary/30 shadow-sm hover:shadow-md'
                } ${feature.isPro ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'
                  } group-hover:bg-primary/20 transition-colors`}>
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  {feature.tag && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-primary to-purple-600 text-white">
                      {feature.tag}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* How It Works */}
      <section className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t('newLanding', 'howTitle')}
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.15 }}
                viewport={{ once: true }}
                className="relative text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 text-white font-bold text-xl mb-5 shadow-lg shadow-primary/25">
                  {step.num}
                </div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.desc}</p>
                
                {/* Arrow between steps */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%]">
                    <div className={`h-0.5 ${theme === 'dark' ? 'bg-zinc-700' : 'bg-gray-200'}`} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Preview Section */}
      <section className={`py-20 sm:py-32 px-4 sm:px-6 lg:px-8 ${theme === 'dark' ? 'bg-zinc-900/50' : 'bg-gray-50/80'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t('newLanding', 'previewTitle')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('newLanding', 'previewSubtitle')}
            </p>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className={`rounded-3xl overflow-hidden shadow-2xl ${theme === 'dark' ? 'bg-zinc-800' : 'bg-white'} border ${theme === 'dark' ? 'border-white/5' : 'border-gray-200'}`}
          >
            {/* Browser bar */}
            <div className={`flex items-center gap-2 px-4 py-3 ${theme === 'dark' ? 'bg-zinc-900' : 'bg-gray-100'} border-b ${theme === 'dark' ? 'border-white/5' : 'border-gray-200'}`}>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className={`flex-1 mx-4 px-4 py-1.5 rounded-lg text-sm text-muted-foreground ${theme === 'dark' ? 'bg-zinc-800' : 'bg-white'}`}>
                mus.link/demo
              </div>
            </div>
            
            {/* Preview content */}
            <div className="p-8 sm:p-12 flex flex-col items-center">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-gradient-to-br from-primary to-purple-600 mb-6 shadow-xl flex items-center justify-center">
                <Music2 className="w-16 h-16 sm:w-20 sm:h-20 text-white/80" />
              </div>
              <h3 className="text-2xl font-bold mb-1">Artist Name</h3>
              <p className="text-muted-foreground mb-8">Track Title</p>
              
              <div className="w-full max-w-md space-y-3">
                {[
                  { name: 'Spotify', color: '#1DB954', icon: FaSpotify },
                  { name: 'Apple Music', color: '#FA233B', icon: FaApple },
                  { name: 'YouTube Music', color: '#FF0000', icon: YouTubeMusicIcon, isImage: true },
                  { name: 'Deezer', color: '#A238FF', icon: DeezerIcon },
                ].map((platform) => (
                  <div 
                    key={platform.name}
                    className={`group w-full py-3.5 px-5 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
                      theme === 'dark' 
                        ? 'bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-primary/50' 
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{ backgroundColor: platform.color }}
                      >
                        {platform.isImage ? (
                          <platform.icon style={{ width: '20px', height: '20px' }} />
                        ) : (
                          <platform.icon className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <span className="font-medium">{platform.name}</span>
                    </div>
                    <span className="text-xs sm:text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {t('common', 'listen')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* FAQ Section */}
      <section className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t('newLanding', 'faqTitle')}
            </h2>
          </div>
          
          <div className={`rounded-2xl ${theme === 'dark' ? 'bg-zinc-800/50' : 'bg-white'} border ${theme === 'dark' ? 'border-white/5' : 'border-gray-200'} p-6 sm:p-8`}>
            {faqs.map((faq, i) => (
              <FAQItem
                key={i}
                question={faq.q}
                answer={faq.a}
                isOpen={openFAQ === i}
                onClick={() => setOpenFAQ(openFAQ === i ? -1 : i)}
              />
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className={`py-20 sm:py-32 px-4 sm:px-6 lg:px-8 ${theme === 'dark' ? 'bg-zinc-900/50' : 'bg-gray-50/80'}`}>
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t('landing', 'ctaTitle')}
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              {t('landing', 'ctaSubtitle')}
            </p>
            <Link to="/register">
              <Button 
                size="lg"
                data-testid="cta-get-started-btn"
                className="bg-primary hover:bg-primary/90 text-lg px-10 py-6 rounded-xl shadow-lg shadow-primary/25"
              >
                {t('landing', 'ctaButton')}
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className={`py-8 px-4 sm:px-6 lg:px-8 border-t ${theme === 'dark' ? 'border-white/5' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            © 2026 Muslink.
          </p>
          <MuslinkLogo height={18} theme={theme} />
          <p className="text-sm text-muted-foreground">
            {t('newLanding', 'footerRights')}
          </p>
        </div>
      </footer>
      
      {/* PRO Feature Modal */}
      <ProFeatureModal 
        open={proModalOpen} 
        onOpenChange={setProModalOpen}
        featureName={proFeatureName}
      />
    </div>
  );
}
