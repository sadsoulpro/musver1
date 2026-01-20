# Настройка поддоменов для Mus.Link

## Обзор

Система поддоменов позволяет пользователям создавать персональные URL вида:
- `artist.mus.link/my-release`
- `band.mus.link/album`

## Требования

1. Wildcard DNS запись `*.mus.link` → IP сервера (через Cloudflare)
2. Wildcard TLS сертификат для `*.mus.link` (через DNS-01 challenge)
3. Caddy конфигурация с модулем cloudflare

## DNS Настройка (Cloudflare)

В панели Cloudflare для домена `mus.link` добавьте:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | YOUR_SERVER_IP | Proxied или DNS only |
| A | www | YOUR_SERVER_IP | Proxied или DNS only |
| A | * | YOUR_SERVER_IP | **DNS only** (важно!) |
| A | dev | YOUR_SERVER_IP | DNS only |

> ⚠️ **Важно**: Wildcard запись `*` должна быть в режиме "DNS only" (серая иконка облака), иначе Cloudflare будет конфликтовать с TLS сертификатом Caddy.

## TLS Сертификат

### Автоматически через Caddy + Cloudflare DNS Challenge

Caddy автоматически получает wildcard сертификаты используя DNS-01 challenge через Cloudflare API.

#### 1. Получение Cloudflare API Token

1. Перейдите на https://dash.cloudflare.com/profile/api-tokens
2. Нажмите **Create Token**
3. Используйте template **Edit zone DNS** или создайте custom:
   - **Permissions**: Zone → DNS → Edit
   - **Zone Resources**: Include → Specific zone → mus.link
4. Скопируйте токен

#### 2. Настройка токена на сервере

```bash
# Создать файл с токеном
sudo nano /etc/caddy/cloudflare.env
```

```
CLOUDFLARE_API_TOKEN=your_token_here
```

```bash
# Защитить файл
sudo chmod 600 /etc/caddy/cloudflare.env
sudo chown caddy:caddy /etc/caddy/cloudflare.env
```

## Caddy Конфигурация

Основной Caddyfile находится в `/etc/caddy/Caddyfile` и `/var/www/mus-link/deploy/caddy/Caddyfile`.

### Структура конфигурации

```caddyfile
# Глобальные настройки
{
    email admin@mus.link
    acme_dns cloudflare {env.CLOUDFLARE_API_TOKEN}
}

# PRODUCTION: mus.link + www.mus.link
mus.link, www.mus.link {
    encode zstd gzip
    
    # API
    handle /api/* {
        reverse_proxy 127.0.0.1:8001
    }
    
    # Uploads
    handle /api/uploads/* {
        uri strip_prefix /api
        root * /var/www/mus-link/backend
        file_server
    }
    
    # Frontend SPA
    handle {
        root * /var/www/mus-link/frontend/build
        try_files {path} /index.html
        file_server
    }
}

# DEV: dev.mus.link
dev.mus.link {
    reverse_proxy 127.0.0.1:3001
}

# WILDCARD: *.mus.link (поддомены)
*.mus.link {
    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    }
    
    # Извлечение поддомена через regex
    @subdomain {
        header_regexp subdomain Host ^([a-zA-Z0-9-]+)\.mus\.link$
    }
    
    # API с передачей поддомена
    handle /api/* {
        reverse_proxy 127.0.0.1:8001 {
            header_up X-Subdomain {re.subdomain.1}
        }
    }
    
    # Frontend
    handle {
        root * /var/www/mus-link/frontend/build
        try_files {path} /index.html
        file_server
    }
}
```

## Применение конфигурации

```bash
# Копировать Caddyfile
sudo cp /var/www/mus-link/deploy/caddy/Caddyfile /etc/caddy/Caddyfile

# Проверить конфигурацию
sudo caddy validate --config /etc/caddy/Caddyfile

# Перезагрузить Caddy (без downtime)
sudo caddy reload --config /etc/caddy/Caddyfile

# Или перезапустить сервис
sudo systemctl restart caddy
```

## Проверка работы

```bash
# Проверка основного домена
curl -I https://mus.link

# Проверка www
curl -I https://www.mus.link

# Проверка поддомена
curl -I https://artist.mus.link

# Проверка API с поддоменом
curl https://artist.mus.link/api/subdomain-page

# Проверка TLS сертификата
echo | openssl s_client -connect mus.link:443 -servername mus.link 2>/dev/null | openssl x509 -noout -dates

# Проверка wildcard сертификата
echo | openssl s_client -connect test.mus.link:443 -servername test.mus.link 2>/dev/null | openssl x509 -noout -text | grep DNS
```

## Backend API

### Эндпоинты для поддоменов

1. **GET /api/subdomain-page** - Получить информацию о поддомене
   - Без параметров: список страниц пользователя
   - С параметром `?slug=xxx`: конкретная страница

2. **GET /api/resolve/{subdomain}** - Проверить поддомен

3. **GET /api/resolve/{subdomain}/page/{slug}** - Получить страницу

### Заголовки

- `X-Subdomain` - Caddy передает поддомен в этом заголовке
- Middleware также извлекает поддомен из Host header

## Frontend интеграция

Frontend определяет, работает ли он на поддомене:

```javascript
// utils/subdomain.js
export function getSubdomain() {
  const host = window.location.hostname;
  const mainDomain = 'mus.link';
  
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

Backend `.env`:

```env
MAIN_DOMAIN=mus.link
```

## Troubleshooting

### DNS Challenge не работает

```bash
# Проверить токен Cloudflare
curl -X GET "https://api.cloudflare.com/client/v4/zones" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Сертификат не выдаётся

```bash
# Проверить логи Caddy
sudo journalctl -u caddy -f

# Проверить что wildcard DNS запись существует
dig +short test.mus.link
```

### X-Subdomain не передаётся

Проверьте что в Caddyfile используется `header_up X-Subdomain {re.subdomain.1}` в секции reverse_proxy для wildcard.
