# 🎵 Mus.Link - Установка и развёртывание

## Описание проекта

**Mus.Link** — это Smart Link сервис для музыкантов (аналог band.link/linktree для музыки). Позволяет создавать единую страницу со ссылками на все музыкальные платформы.

---

## 📋 Полный список функций

### 🎯 Основные функции

#### 1. **Smart Links (Умные ссылки)**
- Создание multi-link страниц для треков/альбомов
- **Автозаполнение через Odesli API** — вставьте одну ссылку (Spotify, Apple Music, YouTube и т.д.) и система автоматически найдёт ссылки на все остальные платформы
- Поддерживаемые платформы: Spotify, Apple Music, YouTube Music, YouTube, Deezer, Tidal, SoundCloud, Yandex Music, VK Music, Amazon Music, iTunes, Napster, Pandora, Audiomack, Bandcamp и другие
- Кастомизация порядка ссылок (drag & drop)
- Включение/отключение отдельных ссылок
- QR-код для каждой страницы

#### 2. **Конструктор страниц (PageBuilder)**
- Название релиза и имя артиста
- Загрузка обложки (cover image)
- Уникальный slug (URL страницы)
- Выбор темы страницы (светлая/тёмная)
- Превью страницы в реальном времени
- Автосохранение изменений

#### 3. **Генератор обложек (RandomCover)**
- AI-генерация фонов через **Hugging Face API** (Stable Diffusion)
- Добавление текста на обложку
- Выбор шрифтов и цветов
- Сохранение проектов обложек
- Экспорт в PNG

#### 4. **Аналитика**
- Просмотры страницы
- Клики по ссылкам (по платформам)
- QR-сканирования
- Шеринги (поделились ссылкой)
- География посетителей
- Графики за 7/30/90 дней
- Глобальная аналитика (все страницы)

#### 5. **Контактная информация**
- Email для связи
- Социальные сети: Telegram, Instagram, VK, TikTok, Twitter/X, Website
- Отображение на публичной странице

#### 6. **Поддомены**
- Создание персональных поддоменов (username.mus.link)
- Привязка страниц к поддоменам
- Управление поддоменами в панели

### 👤 Система пользователей

#### 7. **Аутентификация**
- Регистрация по email
- Вход по email/паролю
- Восстановление пароля через email (Resend API)
- JWT токены (24 часа)

#### 8. **Профиль и настройки**
- Изменение username
- Изменение email
- Смена пароля
- Удаление аккаунта
- Настройки навигации (показывать кнопки сайта)
- Выбор языка (EN/RU)

#### 9. **Система верификации**
- Заявка на верификацию
- Подтверждение администратором
- Синяя галочка на профиле и страницах

### 🛡️ RBAC (Система ролей)

#### 10. **Роли пользователей**
- **Owner** — полный доступ, управление всеми настройками
- **Admin** — доступ к админ-панели, управление пользователями
- **Moderator** — просмотр профилей пользователей, модерация
- **User** — базовый доступ

#### 11. **Планы подписки**
- **Free** — до 3 страниц, базовая аналитика
- **Pro** — до 10 страниц, расширенная аналитика, AI-функции
- **Ultimate** — безлимит, приоритетная поддержка

### 🔧 Админ-панель

#### 12. **Управление пользователями**
- Список всех пользователей с поиском
- Просмотр профиля пользователя и его страниц
- Изменение роли пользователя
- Изменение плана подписки
- Бан/разбан пользователей
- Выдача/отзыв верификации

#### 13. **Модерация**
- Просмотр всех страниц в системе
- Редактирование страниц любого пользователя
- Удаление контента

#### 14. **Статистика системы**
- Общее количество пользователей
- Количество страниц
- Общие клики
- Графики активности

#### 15. **Аудит-логи**
- Журнал действий администраторов
- Логирование просмотров профилей
- Логирование изменений

### 💬 Система поддержки

#### 16. **Тикеты поддержки**
- Создание тикетов пользователями
- Категории: General, Bug, Feature, Billing
- Чат между пользователем и админом
- Статусы: Open, In Progress, Resolved, Closed
- Уведомления о новых сообщениях

### 📧 Email функции (Resend API)

#### 17. **Email уведомления**
- Восстановление пароля
- Уведомления о верификации
- (опционально) Welcome email

### 🌐 SEO и шеринг

#### 18. **Open Graph мета-теги**
- Автоматическая генерация OG-тегов для страниц
- Превью при шеринге в соц. сетях
- Динамические OG-изображения

---

## 🛠️ Технический стек

| Компонент | Технология |
|-----------|------------|
| Backend | FastAPI (Python 3.11+) |
| Frontend | React 18 + Tailwind CSS |
| Database | MongoDB |
| Auth | JWT (JSON Web Tokens) |
| Email | Resend API |
| AI Images | Hugging Face API (Stable Diffusion) |
| Music API | Odesli/Songlink API |
| Charts | Recharts |
| Animations | Framer Motion |
| Icons | Lucide React, React Icons |

---

## 📦 Требования к серверу

### Минимальные требования
- **OS**: Ubuntu 20.04+ / Debian 11+
- **RAM**: 2 GB
- **CPU**: 2 vCPU
- **Disk**: 20 GB SSD
- **Node.js**: 18+
- **Python**: 3.11+
- **MongoDB**: 6.0+

### Рекомендуемые требования
- **RAM**: 4 GB
- **CPU**: 4 vCPU
- **Disk**: 50 GB SSD

---

## 🚀 Установка на VPS

### 1. Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Установка Node.js 18+

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Должно быть v18.x.x
```

### 3. Установка Yarn

```bash
sudo npm install -g yarn
yarn --version
```

### 4. Установка Python 3.11+

```bash
sudo apt install -y python3.11 python3.11-venv python3-pip
python3.11 --version
```

### 5. Установка MongoDB

```bash
# Импорт ключа
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Добавление репозитория
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Установка
sudo apt update
sudo apt install -y mongodb-org

# Запуск и автозагрузка
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod
```

### 6. Установка Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 7. Установка PM2 (менеджер процессов)

```bash
sudo npm install -g pm2
```

### 8. Клонирование проекта

```bash
cd /var/www
sudo git clone <YOUR_REPO_URL> mus-link
cd mus-link
sudo chown -R $USER:$USER /var/www/mus-link
```

### 9. Настройка Backend

```bash
cd /var/www/mus-link/backend

# Создание виртуального окружения
python3.11 -m venv venv
source venv/bin/activate

# Установка зависимостей
pip install -r requirements.txt
```

### 10. Настройка переменных окружения Backend

Создайте файл `/var/www/mus-link/backend/.env`:

```bash
nano /var/www/mus-link/backend/.env
```

```env
# Database
MONGO_URL=mongodb://localhost:27017/smartlink
DB_NAME=smartlink

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Owner (первый суперадмин)
OWNER_EMAIL=your-email@example.com

# URLs
FRONTEND_URL=https://mus.link
MAIN_DOMAIN=mus.link
CORS_ORIGINS=https://mus.link,https://www.mus.link

# Resend API (email)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDER_EMAIL=noreply@mus.link

# Hugging Face API (AI генерация)
HUGGINGFACE_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 11. Настройка Frontend

```bash
cd /var/www/mus-link/frontend

# Установка зависимостей
yarn install
```

Создайте файл `/var/www/mus-link/frontend/.env`:

```bash
nano /var/www/mus-link/frontend/.env
```

```env
REACT_APP_BACKEND_URL=https://mus.link/api
```

### 12. Сборка Frontend

```bash
cd /var/www/mus-link/frontend
yarn build
```

### 13. Настройка PM2 для Backend

Создайте файл `/var/www/mus-link/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'mus-link-backend',
      cwd: '/var/www/mus-link/backend',
      script: 'venv/bin/uvicorn',
      args: 'server:app --host 0.0.0.0 --port 8001',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

Запуск:

```bash
cd /var/www/mus-link
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 14. Настройка Nginx

Создайте файл `/etc/nginx/sites-available/mus-link`:

```nginx
server {
    listen 80;
    server_name mus.link www.mus.link;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mus.link www.mus.link;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/mus.link/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mus.link/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Увеличенные таймауты для AI генерации
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Uploads
    location /api/uploads/ {
        proxy_pass http://127.0.0.1:8001/api/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Frontend (React build)
    location / {
        root /var/www/mus-link/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static files
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # File upload size
    client_max_body_size 50M;
}

# Wildcard subdomains (*.mus.link)
server {
    listen 443 ssl http2;
    server_name *.mus.link;

    ssl_certificate /etc/letsencrypt/live/mus.link/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mus.link/privkey.pem;

    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /var/www/mus-link/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

Активация:

```bash
sudo ln -s /etc/nginx/sites-available/mus-link /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 15. SSL сертификат (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d mus.link -d www.mus.link -d "*.mus.link"
```

### 16. Настройка Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 🔐 Получение API ключей

### Resend API (Email)

1. Зарегистрируйтесь на [resend.com](https://resend.com)
2. Создайте API ключ в разделе API Keys
3. Добавьте домен mus.link в разделе Domains
4. Настройте DNS записи для верификации домена

### Hugging Face API (AI)

1. Зарегистрируйтесь на [huggingface.co](https://huggingface.co)
2. Перейдите в Settings → Access Tokens
3. Создайте новый токен с правами на чтение
4. Используйте токен в переменной HUGGINGFACE_TOKEN

---

## 🗄️ Структура базы данных (MongoDB Collections)

| Коллекция | Описание |
|-----------|----------|
| `users` | Пользователи |
| `pages` | Smart Link страницы |
| `links` | Ссылки на платформы |
| `clicks` | Статистика кликов |
| `subdomains` | Поддомены пользователей |
| `covers` | Загруженные обложки |
| `cover_projects` | Проекты генератора обложек |
| `notifications` | Уведомления |
| `verification_requests` | Заявки на верификацию |
| `tickets` | Тикеты поддержки |
| `ticket_replies` | Ответы в тикетах |
| `waitlist` | Список ожидания |
| `audit_logs` | Журнал аудита |

---

## 📝 Полезные команды

### Управление PM2

```bash
pm2 status                    # Статус процессов
pm2 logs mus-link-backend     # Логи backend
pm2 restart mus-link-backend  # Перезапуск
pm2 stop mus-link-backend     # Остановка
pm2 delete mus-link-backend   # Удаление
```

### MongoDB

```bash
mongosh                       # Подключение к MongoDB
use smartlink                 # Выбор базы данных
db.users.find()              # Просмотр пользователей
db.pages.countDocuments()    # Количество страниц
```

### Логи

```bash
pm2 logs --lines 100         # Последние 100 строк логов
sudo tail -f /var/log/nginx/error.log  # Логи Nginx
```

### Обновление проекта

```bash
cd /var/www/mus-link
git pull origin main

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
pm2 restart mus-link-backend

# Frontend
cd ../frontend
yarn install
yarn build
```

---

## ⚠️ Troubleshooting

### Backend не запускается

```bash
cd /var/www/mus-link/backend
source venv/bin/activate
python -c "from server import app; print('OK')"
```

### MongoDB не подключается

```bash
sudo systemctl status mongod
sudo journalctl -u mongod -n 50
```

### Nginx ошибки

```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### Проверка портов

```bash
sudo netstat -tlnp | grep -E '80|443|8001|27017'
```

---

## 📞 Контакты

- **Email**: support@mus.link
- **Telegram**: @muslink_support

---

## 📄 Лицензия

MIT License

---

**Mus.Link** © 2024-2025. Все права защищены.
