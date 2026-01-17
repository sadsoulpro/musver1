import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, useAuth } from "@/App";
import { toast } from "sonner";
import { 
  MessageCircle, Plus, Send, Clock, CheckCircle, 
  AlertCircle, ArrowLeft, User, Shield, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { useLanguage } from "@/contexts/LanguageContext";

// FAQ Data
const getFaqData = (t) => [
  {
    category: { en: "General Questions", ru: "Общие вопросы", es: "Preguntas generales" },
    subtitle: { en: "For beginners", ru: "Для новичков", es: "Para principiantes" },
    items: [
      {
        question: { en: "What is MyTrack?", ru: "Что такое MyTrack?", es: "¿Qué es MyTrack?" },
        answer: { 
          en: "MyTrack is a tool for artists that combines all links to streaming platforms (Spotify, Apple Music, YouTube Music, etc.) on one beautiful page.",
          ru: "Это инструмент для артистов, который объединяет все ссылки на стриминговые платформы (Spotify, Apple Music, VK Музыка и др.) на одной красивой странице.",
          es: "MyTrack es una herramienta para artistas que combina todos los enlaces a plataformas de streaming (Spotify, Apple Music, YouTube Music, etc.) en una página hermosa."
        }
      },
      {
        question: { en: "Is it free?", ru: "Это бесплатно?", es: "¿Es gratis?" },
        answer: {
          en: "The basic functionality for creating pages is available for free.",
          ru: "Основной функционал создания страниц доступен бесплатно.",
          es: "La funcionalidad básica para crear páginas está disponible de forma gratuita."
        }
      }
    ]
  },
  {
    category: { en: "Technical Questions", ru: "Технические вопросы", es: "Preguntas técnicas" },
    subtitle: { en: "How it works", ru: "Процесс", es: "Cómo funciona" },
    items: [
      {
        question: { en: "How do I add my track?", ru: "Как добавить свой трек?", es: "¿Cómo agrego mi canción?" },
        answer: {
          en: "Simply paste a link to your release from any streaming service (e.g., Spotify or Apple Music) into the search field, and our service will automatically pull links from other platforms.",
          ru: "Просто вставьте ссылку на ваш релиз из любого стриминга (например, Spotify или Apple Music) в поле поиска, и наш сервис автоматически подтянет ссылки на другие площадки.",
          es: "Simplemente pega un enlace a tu lanzamiento de cualquier servicio de streaming (por ejemplo, Spotify o Apple Music) en el campo de búsqueda, y nuestro servicio extraerá automáticamente los enlaces de otras plataformas."
        }
      },
      {
        question: { en: "Can I customize the design?", ru: "Могу ли я изменить оформление?", es: "¿Puedo personalizar el diseño?" },
        answer: {
          en: "Yes, you can upload your own cover and customize the order of platform buttons.",
          ru: "Да, вы можете загрузить свою обложку и настроить порядок отображения кнопок платформ.",
          es: "Sí, puedes subir tu propia portada y personalizar el orden de los botones de las plataformas."
        }
      },
      {
        question: { en: "What is a 'slug'?", ru: 'Что такое "Вид ссылки"?', es: "¿Qué es un 'slug'?" },
        answer: {
          en: "It's the unique name of your page in the URL. For example: mytrack.cc/mysong - the word 'mysong' is the slug.",
          ru: "Это уникальное имя вашей страницы в адресной строке. Например: mytrack.cc/mysong, слово mysong — это и есть вид ссылки.",
          es: "Es el nombre único de tu página en la URL. Por ejemplo: mytrack.cc/mysong - la palabra 'mysong' es el slug."
        }
      }
    ]
  },
  {
    category: { en: "Analytics & Promotion", ru: "Аналитика и продвижение", es: "Analíticas y promoción" },
    subtitle: { en: "Statistics", ru: "Статистика", es: "Estadísticas" },
    items: [
      {
        question: { en: "Where can I see view counts?", ru: "Где я могу увидеть количество просмотров?", es: "¿Dónde puedo ver el conteo de vistas?" },
        answer: {
          en: "View statistics are displayed in your dashboard under the Analytics tab.",
          ru: "Статистика просмотров отображается в вашем личном кабинете во вкладке Аналитика.",
          es: "Las estadísticas de vistas se muestran en tu panel de control en la pestaña Analíticas."
        }
      },
      {
        question: { en: "What is the QR code for?", ru: "Зачем нужен QR-код?", es: "¿Para qué es el código QR?" },
        answer: {
          en: "We automatically create a QR code for each page. You can download it and place it on posters or social media so fans can listen with a single scan.",
          ru: "Мы автоматически создаем QR-код для каждой страницы. Вы можете скачать его и разместить на афишах или в соцсетях, чтобы фанаты могли перейти к прослушиванию за одно сканирование.",
          es: "Creamos automáticamente un código QR para cada página. Puedes descargarlo y colocarlo en pósters o redes sociales para que los fans puedan escuchar con un solo escaneo."
        }
      }
    ]
  },
  {
    category: { en: "Troubleshooting", ru: "Решение проблем", es: "Solución de problemas" },
    subtitle: { en: "Help", ru: "Помощь", es: "Ayuda" },
    items: [
      {
        question: { en: "The service didn't find my track automatically. What should I do?", ru: "Сервис не нашел мой трек автоматически, что делать?", es: "El servicio no encontró mi canción automáticamente. ¿Qué debo hacer?" },
        answer: {
          en: "If auto-search didn't work (for example, if the release just came out), you can manually add platform links in the page editor.",
          ru: "Если автопоиск не сработал (например, если релиз только что вышел), вы можете добавить ссылки на площадки вручную в редакторе страницы.",
          es: "Si la búsqueda automática no funcionó (por ejemplo, si el lanzamiento acaba de salir), puedes agregar los enlaces de las plataformas manualmente en el editor de páginas."
        }
      },
      {
        question: { en: "How do I delete a page?", ru: "Как удалить страницу?", es: "¿Cómo elimino una página?" },
        answer: {
          en: "In your dashboard, click on the trash icon next to the release. Warning: this action is irreversible.",
          ru: "В личном кабинете нажмите на иконку корзины рядом с нужным релизом. Внимание: это действие необратимо.",
          es: "En tu panel de control, haz clic en el ícono de papelera junto al lanzamiento. Advertencia: esta acción es irreversible."
        }
      }
    ]
  }
];

export default function Support() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [activeTab, setActiveTab] = useState("faq");
  
  const [newTicket, setNewTicket] = useState({
    subject: "",
    message: "",
    category: "general"
  });

  const faqData = getFaqData(t);
  const getText = (obj) => obj[language] || obj.en;

  // Translations
  const STATUS_CONFIG = {
    open: { label: t('support', 'statusOpen'), color: "bg-blue-500", icon: AlertCircle },
    in_progress: { label: t('support', 'statusInProgress'), color: "bg-yellow-500", icon: Clock },
    resolved: { label: t('support', 'statusResolved'), color: "bg-green-500", icon: CheckCircle },
    closed: { label: t('support', 'statusClosed'), color: "bg-zinc-500", icon: CheckCircle }
  };

  const CATEGORY_LABELS = {
    general: t('support', 'categoryGeneral'),
    technical: t('support', 'categoryTechnical'),
    billing: t('support', 'categoryBilling'),
    other: t('support', 'categoryOther')
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await api.get("/tickets");
      setTickets(response.data);
    } catch (error) {
      toast.error(t('errors', 'loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      toast.error(t('errors', 'validationError'));
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post("/tickets", newTicket);
      setTickets(prev => [response.data, ...prev]);
      setShowNewDialog(false);
      setNewTicket({ subject: "", message: "", category: "general" });
      toast.success(t('support', 'ticketCreated'));
      setActiveTab("tickets");
    } catch (error) {
      const detail = error.response?.data?.detail;
      const errorMsg = typeof detail === 'string' ? detail : 
                       Array.isArray(detail) ? detail.map(d => d.msg || d).join(', ') :
                       t('errors', 'generic');
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const openTicket = async (ticketId) => {
    try {
      const response = await api.get(`/tickets/${ticketId}`);
      setSelectedTicket(response.data);
      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, is_read_by_user: true } : t
      ));
    } catch (error) {
      toast.error(t('errors', 'loadFailed'));
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;

    setSubmitting(true);
    try {
      const response = await api.post(`/tickets/${selectedTicket.id}/reply`, {
        message: replyText
      });
      setSelectedTicket(response.data);
      setReplyText("");
      setTickets(prev => prev.map(t => 
        t.id === selectedTicket.id ? response.data : t
      ));
      toast.success(t('common', 'success'));
    } catch (error) {
      toast.error(t('errors', 'generic'));
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Sidebar>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
        </div>
      </Sidebar>
    );
  }

  // Ticket detail view
  if (selectedTicket) {
    const StatusIcon = STATUS_CONFIG[selectedTicket.status]?.icon || AlertCircle;
    
    return (
      <Sidebar>
        <div className="max-w-3xl mx-auto p-4 sm:p-6">
          <Button 
            variant="ghost" 
            className="mb-4"
            onClick={() => setSelectedTicket(null)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common', 'back')}
          </Button>

          <div className="bg-card/50 rounded-2xl border border-border p-4 sm:p-6 mb-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-semibold mb-1">{selectedTicket.subject}</h1>
                <p className="text-sm text-muted-foreground">
                  {CATEGORY_LABELS[selectedTicket.category]} • {formatDate(selectedTicket.created_at)}
                </p>
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[selectedTicket.status]?.color} text-white`}>
                <StatusIcon className="w-3 h-3" />
                {STATUS_CONFIG[selectedTicket.status]?.label}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-4 mb-4">
            {selectedTicket.messages?.map((msg, i) => (
              <motion.div
                key={msg.id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl ${
                  msg.sender_role === 'staff' 
                    ? 'bg-primary/10 border border-primary/20 ml-8' 
                    : 'panel-card mr-8'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {msg.sender_role === 'staff' ? (
                    <Shield className="w-4 h-4 text-primary" />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">
                    {msg.sender_role === 'staff' ? t('support', 'staffReply') : t('support', 'yourMessage')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(msg.created_at)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
              </motion.div>
            ))}
          </div>

          {/* Reply form - only if not closed */}
          {selectedTicket.status !== 'closed' && (
            <div className="bg-card/50 rounded-2xl border border-border p-4">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t('support', 'replyPlaceholder')}
                className="bg-muted border-zinc-700 min-h-[100px] mb-3"
              />
              <Button
                onClick={sendReply}
                disabled={submitting || !replyText.trim()}
                className="w-full sm:w-auto"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {t('support', 'sendReply')}
              </Button>
            </div>
          )}
        </div>
      </Sidebar>
    );
  }

  // Main view with tabs
  return (
    <Sidebar>
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display mb-1">{t('support', 'title')}</h1>
            <p className="text-sm text-muted-foreground">{t('support', 'subtitle')}</p>
          </div>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('support', 'newTicket')}
          </Button>
        </div>

        {/* Tabs: FAQ and Tickets */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="panel-card">
            <TabsTrigger value="faq" className="gap-2">
              <HelpCircle className="w-4 h-4" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-2">
              <MessageCircle className="w-4 h-4" />
              {t('support', 'myTickets')}
              {tickets.filter(t => !t.is_read_by_user).length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-red-500 text-white">
                  {tickets.filter(t => !t.is_read_by_user).length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="mt-0">
            <div className="space-y-4 sm:space-y-6">
              {faqData.map((category, categoryIndex) => (
                <motion.div
                  key={categoryIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: categoryIndex * 0.1 }}
                  className="p-4 sm:p-5 rounded-2xl panel-card"
                >
                  {/* Category Header */}
                  <div className="mb-3">
                    <h2 className="text-sm sm:text-base font-semibold">{getText(category.category)}</h2>
                    <p className="text-xs text-muted-foreground">{getText(category.subtitle)}</p>
                  </div>
                  
                  {/* Accordion */}
                  <Accordion type="single" collapsible className="space-y-2">
                    {category.items.map((item, itemIndex) => (
                      <AccordionItem 
                        key={itemIndex} 
                        value={`${categoryIndex}-${itemIndex}`}
                        className="border border-border rounded-xl px-3 bg-muted/30 data-[state=open]:bg-muted/50"
                      >
                        <AccordionTrigger className="text-xs sm:text-sm text-left hover:no-underline py-3">
                          {getText(item.question)}
                        </AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground pb-3">
                          {getText(item.answer)}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </motion.div>
              ))}
              
              {/* Contact prompt */}
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-center">
                <p className="text-sm text-muted-foreground">
                  {t('faq', 'noAnswer')}
                </p>
                <Button 
                  variant="link" 
                  className="text-primary mt-1" 
                  onClick={() => setShowNewDialog(true)}
                >
                  {t('faq', 'contactUs')}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Tickets Tab */}
          <TabsContent value="tickets" className="mt-0">
            {tickets.length === 0 ? (
              <div className="text-center py-16">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">{t('support', 'noTickets')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('support', 'noTicketsDesc')}
                </p>
                <Button onClick={() => setShowNewDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('support', 'createTicket')}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {tickets.map((ticket) => {
                    const StatusIcon = STATUS_CONFIG[ticket.status]?.icon || AlertCircle;
                    const hasUnread = !ticket.is_read_by_user;
                    
                    return (
                      <motion.div
                        key={ticket.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        onClick={() => openTicket(ticket.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-colors hover:bg-muted/50 ${
                          hasUnread 
                            ? 'bg-primary/5 border-primary/30' 
                            : 'bg-card/50 border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {hasUnread && (
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                              )}
                              <h3 className="font-medium truncate">{ticket.subject}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {ticket.messages?.[ticket.messages.length - 1]?.message?.slice(0, 80)}...
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatDate(ticket.updated_at)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {CATEGORY_LABELS[ticket.category]}
                              </span>
                            </div>
                          </div>
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[ticket.status]?.color} text-white ml-3`}>
                            <StatusIcon className="w-3 h-3" />
                            {STATUS_CONFIG[ticket.status]?.label}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* New Ticket Dialog */}
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('support', 'newTicket')}</DialogTitle>
              <DialogDescription>
                {t('support', 'subtitle')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>{t('support', 'category')}</Label>
                <Select 
                  value={newTicket.category} 
                  onValueChange={(val) => setNewTicket(prev => ({ ...prev, category: val }))}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">{t('support', 'categoryGeneral')}</SelectItem>
                    <SelectItem value="technical">{t('support', 'categoryTechnical')}</SelectItem>
                    <SelectItem value="billing">{t('support', 'categoryBilling')}</SelectItem>
                    <SelectItem value="other">{t('support', 'categoryOther')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('support', 'subject')}</Label>
                <Input
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder={t('support', 'subjectPlaceholder')}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>{t('support', 'message')}</Label>
                <Textarea
                  value={newTicket.message}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, message: e.target.value }))}
                  placeholder={t('support', 'messagePlaceholder')}
                  className="mt-1.5 min-h-[120px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                {t('common', 'cancel')}
              </Button>
              <Button onClick={createTicket} disabled={submitting}>
                {submitting ? t('support', 'submitting') : t('support', 'submit')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Sidebar>
  );
}
