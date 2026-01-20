# Caddy Deployment for Mus.Link

Эта папка содержит конфигурацию Caddy для деплоя Mus.Link с поддержкой Cloudflare DNS challenge для wildcard сертификатов.

## Структура файлов

```
deploy/caddy/
├── Caddyfile           # Основная конфигурация Caddy
├── cloudflare.env      # Cloudflare API токен (НЕ коммитить с реальным токеном!)
├── README.md           # Эта документация
└── install.sh          # Скрипт автоустановки
```

## Требования

- Ubuntu 20.04+ / Debian 11+
- Домен mus.link на Cloudflare
- Cloudflare API Token с правами Zone:DNS:Edit

## Быстрая установка

```bash
# Скачать и запустить установщик
cd /var/www/mus-link/deploy/caddy
chmod +x install.sh
sudo ./install.sh
```

## Ручная установка

### 1. Установка Caddy с модулем Cloudflare DNS

```bash
# Установить xcaddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/xcaddy/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/xcaddy-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/xcaddy/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/xcaddy.list
sudo apt update
sudo apt install xcaddy

# Собрать Caddy с модулем Cloudflare
xcaddy build --with github.com/caddy-dns/cloudflare

# Переместить бинарник
sudo mv caddy /usr/bin/caddy
sudo chmod +x /usr/bin/caddy

# Проверить установку
caddy version
caddy list-modules | grep cloudflare
```

### 2. Настройка Cloudflare API Token

1. Перейдите на https://dash.cloudflare.com/profile/api-tokens
2. Создайте токен с правами:
   - **Zone** → **DNS** → **Edit**
   - Выберите зону: mus.link
3. Скопируйте токен

```bash
# Создать файл с токеном
sudo mkdir -p /etc/caddy
sudo nano /etc/caddy/cloudflare.env
```

Содержимое:
```
CLOUDFLARE_API_TOKEN=your_actual_token_here
```

```bash
# Защитить файл
sudo chmod 600 /etc/caddy/cloudflare.env
sudo chown caddy:caddy /etc/caddy/cloudflare.env
```

### 3. Копирование Caddyfile

```bash
sudo cp /var/www/mus-link/deploy/caddy/Caddyfile /etc/caddy/Caddyfile
```

### 4. Настройка systemd для загрузки env

```bash
# Создать override для сервиса
sudo mkdir -p /etc/systemd/system/caddy.service.d
sudo nano /etc/systemd/system/caddy.service.d/override.conf
```

Содержимое:
```ini
[Service]
EnvironmentFile=/etc/caddy/cloudflare.env
```

```bash
sudo systemctl daemon-reload
```

### 5. Создание директорий для логов

```bash
sudo mkdir -p /var/log/caddy
sudo chown caddy:caddy /var/log/caddy
```

### 6. Остановка Nginx (если установлен)

```bash
sudo systemctl stop nginx
sudo systemctl disable nginx
```

### 7. Запуск Caddy

```bash
# Проверить конфигурацию
sudo caddy validate --config /etc/caddy/Caddyfile

# Запустить и включить автозагрузку
sudo systemctl enable caddy
sudo systemctl start caddy

# Проверить статус
sudo systemctl status caddy
```

## Проверка работы

### Чек-лист команд

```bash
# 1. Проверить что Caddy слушает порты
sudo ss -tlnp | grep caddy

# 2. Проверить главную страницу
curl -I https://mus.link

# 3. Проверить API
curl -I https://mus.link/api/health

# 4. Проверить DEV
curl -I https://dev.mus.link

# 5. Проверить wildcard (замените test на реальный поддомен)
curl -I https://test.mus.link

# 6. Проверить TLS сертификат
echo | openssl s_client -connect mus.link:443 -servername mus.link 2>/dev/null | openssl x509 -noout -dates

# 7. Проверить wildcard сертификат
echo | openssl s_client -connect test.mus.link:443 -servername test.mus.link 2>/dev/null | openssl x509 -noout -text | grep DNS
```

### Ожидаемые результаты

- ✅ Caddy слушает :80 и :443
- ✅ https://mus.link возвращает 200
- ✅ https://mus.link/api/health возвращает JSON
- ✅ https://dev.mus.link проксирует на :3001
- ✅ TLS сертификат валиден для mus.link и *.mus.link

## Логи

```bash
# Логи Caddy сервиса
sudo journalctl -u caddy -f

# Логи доступа (production)
sudo tail -f /var/log/caddy/mus-link-access.log

# Логи доступа (dev)
sudo tail -f /var/log/caddy/dev-access.log

# Логи поддоменов
sudo tail -f /var/log/caddy/subdomain-access.log
```

## Управление

```bash
# Перезагрузить конфиг (без downtime)
sudo caddy reload --config /etc/caddy/Caddyfile

# Перезапустить сервис
sudo systemctl restart caddy

# Остановить
sudo systemctl stop caddy

# Статус
sudo systemctl status caddy
```

## Troubleshooting

### Ошибка "permission denied" для cloudflare.env

```bash
sudo chown caddy:caddy /etc/caddy/cloudflare.env
sudo chmod 600 /etc/caddy/cloudflare.env
```

### Caddy не видит переменные окружения

```bash
# Проверить override
cat /etc/systemd/system/caddy.service.d/override.conf

# Перезагрузить systemd
sudo systemctl daemon-reload
sudo systemctl restart caddy
```

### Ошибка DNS challenge

```bash
# Проверить токен
curl -X GET "https://api.cloudflare.com/client/v4/zones" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Порт 80/443 занят

```bash
# Найти процесс
sudo lsof -i :80
sudo lsof -i :443

# Остановить Nginx если он запущен
sudo systemctl stop nginx
sudo systemctl disable nginx
```

## Миграция с Nginx

```bash
# 1. Остановить Nginx
sudo systemctl stop nginx
sudo systemctl disable nginx

# 2. Установить Caddy (см. выше)

# 3. Проверить что Nginx не запустится автоматически
sudo systemctl is-enabled nginx  # должно быть disabled

# 4. Запустить Caddy
sudo systemctl enable caddy
sudo systemctl start caddy
```

## Безопасность

⚠️ **ВАЖНО:**
- Никогда не коммитьте реальный Cloudflare API токен в репозиторий
- Файл `/etc/caddy/cloudflare.env` должен иметь права 600
- Регулярно ротируйте API токены
