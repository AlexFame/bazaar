# Docker Setup для Bazaar

## Быстрый старт

### Production режим
```bash
# Собрать и запустить
docker-compose up -d

# Остановить
docker-compose down

# Посмотреть логи
docker-compose logs -f app
```

### Development режим (с hot reload)
```bash
# Запустить в dev режиме
docker-compose -f docker-compose.dev.yml up

# Остановить
docker-compose -f docker-compose.dev.yml down
```

## Что включено

### Production (docker-compose.yml)
- **app** - Next.js приложение (порт 3000)
- **postgres** - PostgreSQL база данных (порт 5432)
- **pgadmin** - Веб-интерфейс для управления БД (порт 5050)

### Development (docker-compose.dev.yml)
- **app-dev** - Next.js с hot reload
- **postgres** - PostgreSQL для разработки

## Настройка

1. Создайте файл `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
TG_BOT_TOKEN=your_bot_token
```

2. Для локальной БД (опционально):
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/bazaar
```

## Полезные команды

```bash
# Пересобрать образы
docker-compose build

# Запустить только БД
docker-compose up postgres

# Подключиться к БД
docker-compose exec postgres psql -U postgres -d bazaar

# Применить миграции
docker-compose exec postgres psql -U postgres -d bazaar -f /docker-entrypoint-initdb.d/your_migration.sql

# Очистить все данные
docker-compose down -v
```

## pgAdmin

Доступен по адресу: http://localhost:5050

- Email: admin@bazaar.local
- Password: admin

Для подключения к БД:
- Host: postgres
- Port: 5432
- Username: postgres
- Password: postgres
- Database: bazaar

## Бэкапы

```bash
# Создать бэкап
docker-compose exec postgres pg_dump -U postgres bazaar > backup.sql

# Восстановить из бэкапа
docker-compose exec -T postgres psql -U postgres bazaar < backup.sql
```

## Troubleshooting

### Порты заняты
Измените порты в docker-compose.yml:
```yaml
ports:
  - "3001:3000"  # вместо 3000:3000
```

### Проблемы с правами
```bash
sudo chown -R $USER:$USER .
```

### Очистка
```bash
# Удалить все контейнеры и образы
docker-compose down --rmi all -v

# Очистить Docker полностью
docker system prune -a
```
