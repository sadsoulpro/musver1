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
- **Pro** — безлимит страниц, расширенная аналитика, AI-функции

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
| Web Server | **Caddy** (reverse proxy + TLS) |
| Auth | JWT (JSON Web Tokens) |
| Email | Resend API |
| AI Images | Hugging Face API (Stable Diffusion) |
| Music API | Odesli/Songlink API |
| Charts | Recharts |
| Animations | Framer Motion |
| Icons | Lucide React, React Icons |
| DNS/CDN | Cloudflare |

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

### 6. Установка Caddy с Cloudflare DNS

> ⚠️ **Важно**: Мы используем Caddy с модулем cloudflare для DNS-01 challenge, что позволяет получать wildcard сертификаты для *.mus.link

```bash
# Установить зависимости
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl golang-go

# Установить xcaddy
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/xcaddy/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/xcaddy-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/xcaddy/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/xcaddy.list
sudo apt update
sudo apt install -y xcaddy

# Собрать Caddy с модулем Cloudflare
cd /tmp
xcaddy build --with github.com/caddy-dns/cloudflare

# Установить бинарник
sudo mv caddy /usr/bin/caddy
sudo chmod +x /usr/bin/caddy
sudo setcap cap_net_bind_service=+ep /usr/bin/caddy

# Проверить установку
caddy version
caddy list-modules | grep cloudflare
```

### 7. Установка PM2 (менеджер процессов)

```bash
sudo npm install -g pm2
```

### 8. Клонирование проекта

```bash
cd /var/www
sudo git clone https://github.com/sadsoulpro/mu-mu.git mus-link
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

---

## 🌐 Настройка Caddy

### 14. Получение Cloudflare API Token

1. Перейдите на https://dash.cloudflare.com/profile/api-tokens
2. Нажмите **Create Token**
3. Выберите **Edit zone DNS** template или создайте custom:
   - **Permissions**: Zone → DNS → Edit
   - **Zone Resources**: Include → Specific zone → mus.link
4. Скопируйте токен

### 15. Настройка Cloudflare Token

```bash
# Создать директорию конфигурации
sudo mkdir -p /etc/caddy

# Создать файл с токеном
sudo nano /etc/caddy/cloudflare.env
```

Содержимое:
```
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here
```

```bash
# Защитить файл
sudo chmod 600 /etc/caddy/cloudflare.env
```

### 16. Копирование Caddyfile

```bash
sudo cp /var/www/mus-link/deploy/caddy/Caddyfile /etc/caddy/Caddyfile
```

### 17. Создание systemd сервиса

```bash
sudo nano /etc/systemd/system/caddy.service
```

```ini
[Unit]
Description=Caddy Web Server
Documentation=https://caddyserver.com/docs/
After=network.target network-online.target
Requires=network-online.target

[Service]
Type=notify
User=caddy
Group=caddy
EnvironmentFile=/etc/caddy/cloudflare.env
ExecStart=/usr/bin/caddy run --environ --config /etc/caddy/Caddyfile
ExecReload=/usr/bin/caddy reload --config /etc/caddy/Caddyfile --force
TimeoutStopSec=5s
LimitNOFILE=1048576
LimitNPROC=512
PrivateTmp=true
ProtectSystem=full
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
```

### 18. Создание пользователя и директорий

```bash
# Создать пользователя caddy
sudo useradd --system --home /var/lib/caddy --shell /usr/sbin/nologin caddy

# Создать директории
sudo mkdir -p /var/log/caddy
sudo mkdir -p /var/lib/caddy
sudo chown -R caddy:caddy /var/log/caddy
sudo chown -R caddy:caddy /var/lib/caddy
sudo chown caddy:caddy /etc/caddy/cloudflare.env
```

### 19. Запуск Caddy

```bash
# Перезагрузить systemd
sudo systemctl daemon-reload

# Проверить конфигурацию
sudo caddy validate --config /etc/caddy/Caddyfile

# Запустить и включить автозагрузку
sudo systemctl enable caddy
sudo systemctl start caddy

# Проверить статус
sudo systemctl status caddy
```

### 20. Настройка Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## ✅ Проверка работы

### Чек-лист команд

```bash
# 1. Проверить что Caddy слушает порты
sudo ss -tlnp | grep caddy

# 2. Проверить главную страницу
curl -I https://mus.link

# 3. Проверить API
curl https://mus.link/api/health

# 4. Проверить DEV (если настроен)
curl -I https://dev.mus.link

# 5. Проверить TLS сертификат
echo | openssl s_client -connect mus.link:443 -servername mus.link 2>/dev/null | openssl x509 -noout -dates

# 6. Проверить wildcard сертификат
echo | openssl s_client -connect test.mus.link:443 -servername test.mus.link 2>/dev/null | openssl x509 -noout -text | grep DNS
```

### Ожидаемые результаты

- ✅ Caddy слушает :80 и :443
- ✅ https://mus.link возвращает 200
- ✅ https://mus.link/api/health возвращает JSON
- ✅ https://dev.mus.link проксирует на :3001
- ✅ TLS сертификат валиден для mus.link и *.mus.link

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
| `plan_configs` | Конфигурации планов |

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

### Управление Caddy

```bash
sudo systemctl status caddy   # Статус
sudo systemctl restart caddy  # Перезапуск
sudo systemctl stop caddy     # Остановка

# Перезагрузка конфига без downtime
sudo caddy reload --config /etc/caddy/Caddyfile

# Валидация конфига
sudo caddy validate --config /etc/caddy/Caddyfile
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
pm2 logs --lines 100                      # Логи backend
sudo journalctl -u caddy -f               # Логи Caddy (systemd)
sudo tail -f /var/log/caddy/mus-link-access.log  # Access логи
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

# Caddy (если изменился Caddyfile)
sudo cp deploy/caddy/Caddyfile /etc/caddy/Caddyfile
sudo caddy reload --config /etc/caddy/Caddyfile
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

### Caddy ошибки

```bash
# Проверить конфигурацию
sudo caddy validate --config /etc/caddy/Caddyfile

# Логи
sudo journalctl -u caddy -f

# Проверить что порты свободны
sudo lsof -i :80
sudo lsof -i :443
```

### DNS Challenge не работает

```bash
# Проверить Cloudflare токен
curl -X GET "https://api.cloudflare.com/client/v4/zones" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Проверить что токен загружен
sudo systemctl show caddy --property=Environment
```

### Проверка портов

```bash
sudo ss -tlnp | grep -E '80|443|8001|27017'
```

---

## 🔄 Миграция с Nginx на Caddy

Если у вас уже установлен Nginx:

```bash
# 1. Остановить и отключить Nginx
sudo systemctl stop nginx
sudo systemctl disable nginx

# 2. Проверить что Nginx не запустится
sudo systemctl is-enabled nginx  # должно быть disabled

# 3. Установить Caddy (см. раздел 6)

# 4. Запустить Caddy
sudo systemctl enable caddy
sudo systemctl start caddy
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
