// lib/searchUtils.js

// Синонимы и переводы для умного поиска
export const SYNONYMS = {
  // Apple
  iphone: ["айфон", "apple phone"],
  айфон: ["iphone", "apple phone"],
  ipad: ["айпад", "планшет apple"],
  айпад: ["ipad", "планшет apple"],
  macbook: ["макбук", "apple laptop", "ноутбук apple"],
  макбук: ["macbook", "apple laptop", "ноутбук apple"],
  airpods: ["аирподс", "эйрподс", "наушники apple"],
  
  // Auto
  bmw: ["бмв", "бимер"],
  бмв: ["bmw"],
  mercedes: ["мерседес", "мерс"],
  мерседес: ["mercedes", "benz"],
  audi: ["ауди"],
  ауди: ["audi"],
  toyota: ["тойота", "тайота"],
  тойота: ["toyota"],
  honda: ["хонда"],
  хонда: ["honda"],
  
  // General
  phone: ["телефон", "смартфон", "мобильный"],
  телефон: ["phone", "smartphone", "mobile"],
  laptop: ["ноутбук", "лэптоп", "компьютер"],
  ноутбук: ["laptop", "pc"],
  car: ["машина", "авто", "автомобиль"],
  машина: ["car", "auto"],
  авто: ["car", "auto"],
  
  // Services
  ремонт: ["repair", "fix", "service"],
  repair: ["ремонт", "починка"],
  уборка: ["cleaning", "клининг"],
  cleaning: ["уборка", "чистка"],
  маникюр: ["manicure", "nails", "ногти"],
  manicure: ["маникюр"],
  
  // Furniture
  диван: ["sofa", "couch", "софа"],
  sofa: ["диван", "софа"],
  кровать: ["bed", "спальня"],
  bed: ["кровать"],
  стол: ["table", "desk"],
  table: ["стол"],
  шкаф: ["wardrobe", "closet"],
  wardrobe: ["шкаф"],
};

// Ключевые слова для определения категории
export const CATEGORY_KEYWORDS = {
  auto: ["bmw", "mercedes", "audi", "toyota", "honda", "ford", "kia", "hyundai", "mazda", "nissan", "volkswagen", "skoda", "ваз", "лада", "жигули", "машина", "авто", "car", "sedan", "suv", "джип", "купе", "пробег", "дизель", "бензин", "электромобиль", "hybrid"],
  autoparts: ["запчасти", "двигатель", "шины", "диски", "колеса", "аккумулятор", "масло", "фильтр", "бампер", "фара", "parts", "tires", "engine", "oil", "filter", "bumper"],
  electronics: ["iphone", "samsung", "xiaomi", "redmi", "huawei", "honor", "pixel", "macbook", "ipad", "airpods", "sony", "playstation", "xbox", "nintendo", "телефон", "смартфон", "ноутбук", "планшет", "камера", "фотоаппарат", "наушники", "часы", "smart watch", "tv", "телевизор"],
  realty: ["квартира", "дом", "комната", "участок", "аренда", "снять", "купить жилье", "офис", "помещение", "гараж", "новостройка", "вторичка", "этаж", "apartment", "house", "flat", "rent", "room"],
  jobs: ["работа", "вакансия", "требуется", "ищу работу", "подработка", "грузчик", "водитель", "продавец", "менеджер", "job", "vacancy", "hiring", "driver", "manager"],
  business: ["ремонт", "услуги", "мастер", "сантехник", "электрик", "муж на час", "уборка", "клининг", "маникюр", "ресницы", "брови", "стрижка", "окрашивание", "фотограф", "видеограф", "дизайн", "сайт", "разработка", "smm", "таргет", "бухгалтер", "юрист", "перевод", "service", "repair", "cleaning", "manicure", "lawyer", "accountant"],
  kids: ["коляска", "кроватка", "игрушки", "памперсы", "детский", "ребенок", "малыш", "одежда для детей", "обувь для детей", "stroller", "toys", "kids", "baby"],
  fashion: ["платье", "джинсы", "футболка", "куртка", "пальто", "обувь", "кроссовки", "сумка", "рюкзак", "часы", "украшения", "clothes", "shoes", "dress", "jacket", "sneakers", "bag"],
  home_garden: ["посуда", "инструмент", "дрель", "перфоратор", "сад", "огород", "рассада", "цветы", "растения", "garden", "plants", "tools", "drill"],
  furniture: ["диван", "кровать", "стол", "стул", "шкаф", "кухня", "кресло", "тумба", "furniture", "sofa", "table", "chair", "wardrobe", "bed"],
  pets: ["собака", "кошка", "кот", "щенок", "котенок", "попугай", "рыбки", "аквариум", "корм", "dog", "cat", "pet", "puppy", "kitten", "fish"],
  hobby_sport: ["велосипед", "самокат", "гитара", "пианино", "палатка", "мяч", "гантели", "тренажер", "книги", "коллекционирование", "bicycle", "scooter", "guitar", "piano", "tent", "ball", "sport", "music", "book"],
  free: ["бесплатно", "даром", "подарок", "отдам", "free", "gift", "giveaway"],
  exchange: ["обмен", "меняю", "бартер", "exchange", "swap", "trade"],
};

/**
 * Расширяет поисковый запрос синонимами
 * @param {string} term 
 * @returns {string} - строка для поиска (term | synonym1 | synonym2)
 */
export function expandSearchTerm(term) {
  if (!term) return "";
  const lowerTerm = term.toLowerCase().trim();
  const synonyms = SYNONYMS[lowerTerm] || [];
  
  if (synonyms.length === 0) return term;
  
  // Формируем строку для Supabase .or() или просто возвращаем расширенный список
  // В нашем случае мы будем использовать это для формирования поискового запроса
  // Но Supabase .ilike() не поддерживает OR внутри строки так просто.
  // Поэтому мы вернем массив слов, чтобы потом искать по ним.
  // Для простоты пока вернем оригинальный термин, но логика готова для расширения.
  // В текущей реализации Supabase поиска мы используем .ilike(), который ищет подстроку.
  // Чтобы искать "iphone" ИЛИ "айфон", нам нужно менять логику запроса в FeedPageClient.
  
  return [lowerTerm, ...synonyms].join("|"); 
}

/**
 * Пытается определить категорию по поисковому запросу
 * @param {string} term 
 * @returns {string|null} - ключ категории или null
 */
export function detectCategory(term) {
  if (!term) return null;
  const lowerTerm = term.toLowerCase().trim();
  
  for (const [catKey, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    // Проверяем точное совпадение или вхождение слова
    if (keywords.some(k => lowerTerm.includes(k))) {
      return catKey;
    }
  }
  
  return null;
}

/**
 * Генерирует подсказки с учетом языка интерфейса
 * @param {string} term 
 * @param {string} lang - 'ru' | 'ua' | 'en'
 * @returns {Array}
 */
export function getSuggestions(term, lang = 'ru') {
  if (!term || term.length < 2) return [];
  const lowerTerm = term.toLowerCase().trim();
  
  const suggestions = [];
  
  // Helper function to check if string is in specific language
  const isCyrillic = (str) => /[а-яА-ЯёЁіІїЇєЄ]/.test(str);
  const isLatin = (str) => /^[a-zA-Z\s]+$/.test(str);
  
  // Determine which language to show based on interface language
  const shouldShowCyrillic = lang === 'ru' || lang === 'ua';
  const shouldShowLatin = lang === 'en';
  
  // 1. Ищем совпадения в ключевых словах категорий
  for (const [catKey, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matched = keywords.filter(k => {
      const startsWithTerm = k.startsWith(lowerTerm);
      if (!startsWithTerm) return false;
      
      // Show suggestions in interface language
      if (shouldShowCyrillic) {
        return isCyrillic(k);
      } else if (shouldShowLatin) {
        return isLatin(k);
      }
      return true;
    });
    
    matched.forEach(m => {
      suggestions.push({ text: m, category: catKey, type: 'keyword' });
    });
  }
  
  // 2. Добавляем синонимы в нужном языке
  if (SYNONYMS[lowerTerm]) {
      SYNONYMS[lowerTerm].forEach(s => {
          if (shouldShowCyrillic && isCyrillic(s)) {
              suggestions.push({ text: s, type: 'synonym' });
          } else if (shouldShowLatin && isLatin(s)) {
              suggestions.push({ text: s, type: 'synonym' });
          }
      });
  }

  // Убираем дубликаты и лимитируем
  const unique = [];
  const seen = new Set();
  
  for (const s of suggestions) {
      if (!seen.has(s.text)) {
          seen.add(s.text);
          unique.push(s);
      }
  }
  
  return unique.slice(0, 5);
}
