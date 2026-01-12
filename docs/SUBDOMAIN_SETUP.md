# Настройка поддоменов для MyTrack

## Обзор

Система поддоменов позволяет пользователям создавать персональные URL вида:
- `music.mytrack.cc/my-release`
- `artist.mytrack.cc/album`

## Требования

1. Wildcard DNS запись `*.mytrack.cc` → IP сервера
2. Wildcard SSL сертификат для `*.mytrack.cc`
3. Nginx конфигурация

## DNS Настройка

Добавьте в DNS зону домена `mytrack.cc`:

```
*.mytrack.cc.    A    YOUR_SERVER_IP
*.mytrack.cc.    AAAA YOUR_SERVER_IPV6  (опционально)
```

## SSL Сертификат

### Let's Encrypt с Certbot (рекомендуется)

```bash
# Установка certbot
apt install certbot python3-certbot-nginx

# Получение wildcard сертификата (требует DNS challenge)
certbot certonly --manual --preferred-challenges=dns \
  -d mytrack.cc -d *.mytrack.cc

# Или через Cloudflare DNS plugin
apt install python3-certbot-dns-cloudflare
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d mytrack.cc -d *.mytrack.cc
```

## Nginx Конфигурация

Создайте файл `/etc/nginx/sites-available/mytrack`:

```nginx
# Основной домен и www
server {
    listen 80;
    listen [::]:80;
    server_name mytrack.cc www.mytrack.cc;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name mytrack.cc www.mytrack.cc;
    
    ssl_certificate /etc/letsencrypt/live/mytrack.cc/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mytrack.cc/privkey.pem;
    
    # Frontend (React)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Поддомены (*.mytrack.cc)
server {
    listen 80;
    listen [::]:80;
    server_name *.mytrack.cc;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name *.mytrack.cc;
    
    ssl_certificate /etc/letsencrypt/live/mytrack.cc/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mytrack.cc/privkey.pem;
    
    # Извлекаем поддомен из хоста
    set $subdomain "";
    if ($host ~* ^([^.]+)\.mytrack\.cc$) {
        set $subdomain $1;
    }
    
    # Статические файлы (uploads)
    location /api/uploads {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # API для поддоменов
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Subdomain $subdomain;
    }
    
    # Все остальные запросы → Frontend
    # Frontend будет использовать API для загрузки данных по поддомену
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Subdomain $subdomain;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Активация конфигурации

```bash
# Создание симлинка
ln -s /etc/nginx/sites-available/mytrack /etc/nginx/sites-enabled/

# Проверка конфигурации
nginx -t

# Перезагрузка nginx
systemctl reload nginx
```

## Проверка работы

```bash
# Проверка основного домена
curl -I https://mytrack.cc

# Проверка поддомена
curl -I https://music.mytrack.cc

# Проверка API с поддоменом
curl https://music.mytrack.cc/api/subdomain-page
```

## Backend API

### Эндпоинты для поддоменов

1. **GET /api/subdomain-page** - Получить информацию о поддомене
   - Без параметров: список страниц пользователя
   - С параметром `?slug=xxx`: конкретная страница

2. **GET /api/resolve/{subdomain}** - Проверить поддомен

3. **GET /api/resolve/{subdomain}/page/{slug}** - Получить страницу

### Заголовки

- `X-Subdomain` - Nginx передает поддомен в этом заголовке
- Middleware также извлекает поддомен из Host header

## Frontend интеграция

Frontend должен определять, работает ли он на поддомене:

```javascript
// utils/subdomain.js
export function getSubdomain() {
  const host = window.location.hostname;
  const mainDomain = 'mytrack.cc';
  
  if (host.endsWith(`.${mainDomain}`)) {
    return host.replace(`.${mainDomain}`, '');
  }
  return null;
}

// Использование
const subdomain = getSubdomain();
if (subdomain) {
  // Мы на поддомене - показываем страницы артиста
  fetchSubdomainPages(subdomain);
} else {
  // Основной сайт
  showMainApp();
}
```

## Переменные окружения

Добавьте в `.env` бэкенда:

```env
MAIN_DOMAIN=mytrack.cc
```
