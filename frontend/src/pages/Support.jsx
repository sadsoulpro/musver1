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
import { api, useAuth } from "@/App";
import { toast } from "sonner";
import { 
  MessageCircle, Plus, Send, Clock, CheckCircle, 
  AlertCircle, ArrowLeft, User, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";

const STATUS_CONFIG = {
  open: { label: "Открыт", color: "bg-blue-500", icon: AlertCircle },
  in_progress: { label: "В работе", color: "bg-yellow-500", icon: Clock },
  resolved: { label: "Решён", color: "bg-green-500", icon: CheckCircle },
  closed: { label: "Закрыт", color: "bg-zinc-500", icon: CheckCircle }
};

const CATEGORY_LABELS = {
  general: "Общие вопросы",
  technical: "Технические проблемы",
  billing: "Оплата и подписка",
  other: "Другое"
};

export default function Support() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyText, setReplyText] = useState("");
  
  const [newTicket, setNewTicket] = useState({
    subject: "",
    message: "",
    category: "general"
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await api.get("/tickets");
      setTickets(response.data);
    } catch (error) {
      toast.error("Не удалось загрузить обращения");
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      toast.error("Заполните все поля");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post("/tickets", newTicket);
      setTickets(prev => [response.data, ...prev]);
      setShowNewDialog(false);
      setNewTicket({ subject: "", message: "", category: "general" });
      toast.success("Обращение отправлено");
    } catch (error) {
      const detail = error.response?.data?.detail;
      const errorMsg = typeof detail === 'string' ? detail : 
                       Array.isArray(detail) ? detail.map(d => d.msg || d).join(', ') :
                       "Не удалось создать обращение";
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const openTicket = async (ticketId) => {
    try {
      const response = await api.get(`/tickets/${ticketId}`);
      setSelectedTicket(response.data);
      // Update local list to mark as read
      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, is_read_by_user: true } : t
      ));
    } catch (error) {
      toast.error("Не удалось загрузить обращение");
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
      // Update tickets list
      setTickets(prev => prev.map(t => 
        t.id === selectedTicket.id ? response.data : t
      ));
      toast.success("Сообщение отправлено");
    } catch (error) {
      toast.error("Не удалось отправить сообщение");
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
            Назад к списку
          </Button>

          <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-4 sm:p-6 mb-4">
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
                    : 'bg-zinc-900/50 border border-white/5 mr-8'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {msg.sender_role === 'staff' ? (
                    <Shield className="w-4 h-4 text-primary" />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">
                    {msg.sender_role === 'staff' ? 'Поддержка' : 'Вы'}
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
            <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-4">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Напишите ответ..."
                className="bg-zinc-800 border-zinc-700 min-h-[100px] mb-3"
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
                Отправить
              </Button>
            </div>
          )}
        </div>
      </Sidebar>
    );
  }

  // Tickets list view
  return (
    <Sidebar>
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display mb-1">Поддержка</h1>
            <p className="text-sm text-muted-foreground">Ваши обращения в службу поддержки</p>
          </div>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Новое обращение
          </Button>
        </div>

        {/* Tickets List */}
        {tickets.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Нет обращений</h3>
            <p className="text-sm text-muted-foreground mb-4">
              У вас пока нет обращений в поддержку
            </p>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Создать обращение
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
                    className={`p-4 rounded-xl border cursor-pointer transition-colors hover:bg-zinc-800/50 ${
                      hasUnread 
                        ? 'bg-primary/5 border-primary/30' 
                        : 'bg-zinc-900/50 border-white/5'
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

        {/* New Ticket Dialog */}
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Новое обращение</DialogTitle>
              <DialogDescription>
                Опишите вашу проблему или вопрос
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>Категория</Label>
                <Select 
                  value={newTicket.category} 
                  onValueChange={(val) => setNewTicket(prev => ({ ...prev, category: val }))}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Общие вопросы</SelectItem>
                    <SelectItem value="technical">Технические проблемы</SelectItem>
                    <SelectItem value="billing">Оплата и подписка</SelectItem>
                    <SelectItem value="other">Другое</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Тема</Label>
                <Input
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Кратко опишите проблему"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Сообщение</Label>
                <Textarea
                  value={newTicket.message}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Подробно опишите вашу проблему или вопрос..."
                  className="mt-1.5 min-h-[120px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                Отмена
              </Button>
              <Button onClick={createTicket} disabled={submitting}>
                {submitting ? "Отправка..." : "Отправить"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Sidebar>
  );
}
