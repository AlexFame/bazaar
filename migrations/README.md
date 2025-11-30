# Database Migration Required

## SQL Function to Create

Тебе нужно выполнить эту SQL миграцию в Supabase SQL Editor:

```sql
-- Create function to increment view count
CREATE OR REPLACE FUNCTION increment_view_count(listing_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE listings
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = listing_id;
END
$$;
```

**ВАЖНО**: Убрал точку с запятой перед `END` - это была ошибка синтаксиса!

## Как выполнить:

1. Открой Supabase Dashboard
2. Перейди в SQL Editor
3. Скопируй и вставь SQL код выше
4. Нажми "Run"

После этого ошибка `404 increment_view_count` исчезнет.
