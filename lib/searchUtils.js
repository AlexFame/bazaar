// lib/searchUtils.js

// Синонимы и переводы для умного поиска (RU/UA/EN)
// Updated for Vercel trigger
export const SYNONYMS = {
  // Apple
  iphone: ["айфон", "apple phone"],
  айфон: ["iphone", "apple phone"],
  ipad: ["айпад", "планшет apple"],
  айпад: ["ipad", "планшет apple"],
  macbook: ["макбук", "apple laptop", "ноутбук apple"],
  макбук: ["macbook", "apple laptop", "ноутбук apple"],
  airpods: ["аирподс", "аірподс", "эйрподс", "наушники apple", "навушники apple"],
  
  // Transliteration / Prefixes
  ай: ["iphone", "ipad", "airpods", "apple"],
  эпл: ["apple", "iphone", "ipad"],
  apple: ["эпл", "айфон", "айпад"],
  
  // Auto
  bmw: ["бмв", "бмв", "бимер"],
  бмв: ["bmw"],
  mercedes: ["мерседес", "мерседес", "мерс"],
  мерседес: ["mercedes", "benz"],
  audi: ["ауди", "ауді"],
  ауди: ["audi"],
  ауді: ["audi"],
  toyota: ["тойота", "тойота", "тайота"],
  тойота: ["toyota"],
  honda: ["хонда", "хонда"],
  хонда: ["honda"],
  
  // General
  phone: ["телефон", "телефон", "смартфон", "мобильный", "мобільний"],
  телефон: ["phone", "smartphone", "mobile"],
  laptop: ["ноутбук", "ноутбук", "лэптоп", "компьютер", "комп'ютер"],
  ноутбук: ["laptop", "pc"],
  car: ["машина", "машина", "авто", "автомобиль", "автомобіль"],
  машина: ["car", "auto"],
  авто: ["car", "auto"],
  
  // Services
  ремонт: ["repair", "fix", "service"],
  repair: ["ремонт", "починка"],
  уборка: ["cleaning", "клининг", "прибирання"],
  cleaning: ["уборка", "прибирання", "чистка"],
  маникюр: ["manicure", "nails", "ногти", "нігті"],
  manicure: ["маникюр", "манікюр"],
  
  // Furniture
  диван: ["sofa", "couch", "софа"],
  sofa: ["диван", "софа"],
  кровать: ["bed", "спальня", "ліжко"],
  bed: ["кровать", "ліжко"],
  ліжко: ["bed", "кровать"],
  стол: ["table", "desk", "стіл"],
  table: ["стол", "стіл"],
  стіл: ["table", "стол"],
  шкаф: ["wardrobe", "closet", "шафа"],
  wardrobe: ["шкаф", "шафа"],
  шафа: ["wardrobe", "шкаф"],
};

// Ключевые слова для определения категории
export const CATEGORY_KEYWORDS = {
  // 1. Translations (Specific)
  translations: [
    "translations", "переводы и супровід", "документы", "помощь с документами", "оформление документов", "оформление", "заявление",
    "справка", "анкета", "заполнение бумаг", "бюрократия", "documents", "paperwork", "help with documents", "filling forms",
    "application", "form assistance", "registration", "документи", "допомога з документами", "оформлення документів", 
    "заповнення форм", "довідка", "реєстрація", "перевод", "письменный перевод", "устный перевод", "переводчик", 
    "перевод текста", "общение с ведомствами", "translation", "translator", "document translation", "text translation", 
    "interpreter", "interpreting", "переклад", "перекладач", "переклад документів", "усний переклад", "письмовий переклад", 
    "супровід", "сопровождение", "сопровождение на термин", "в ведомство", "на прием", "помощь на встрече", 
    "переводчик на встречу", "сопровождение больница", "appointment assistance", "accompany to appointment", 
    "support at meeting", "interpreter at appointment", "accompany hospital", "супровід на термін", "на прийом", 
    "супровід до лікарні", "перекладач на зустрічі"
  ],

  // 2. Education (Specific)
  education: [
    "education", "учеба", "учебник", "учебники", "книги для школы", "пособие", "тетрадь", "textbooks", "study book", 
    "school book", "workbook", "підручник", "підручники", "зошит", "навчальні книги", "посібник", "канцелярия", "канцтовары", 
    "ручки", "тетради", "маркеры", "пенал", "stationery", "office supplies", "pens", "notebooks", "school supplies", 
    "канцелярія", "канцтовари", "зошити", "школьные товары", "школьные принадлежности", "портфель", "рюкзак", 
    "сумка для школы", "backpack", "school bag", "lunchbox", "товари для школи", "шкільні речі", "ланчбокс", "литература", 
    "художественные книги", "учебная литература", "классика", "literature", "books", "novels", "classic book", "література", 
    "книги", "художня література", "класика"
  ],

  // 3. Help Offer (Specific)
  help_offer: [
    "help_offer", "помощь", "физическая помощь", "помощь по дому", "перенести", "починить", "грузчик", "physical help", 
    "move items", "lifting", "repair", "handyman", "фізична допомога", "допомога по дому", "перенести речі", "вантажник", 
    "ремонт", "совет", "консультация", "помощь советом", "консультация специалиста", "advice", "consultation", 
    "expert advice", "порада", "консультація", "допомога порадою", "подвезти", "транспорт", "забрать", "доставить", 
    "отвезти", "transport", "ride", "delivery", "pick up", "drop off", "підвезти", "привезти", "відвезти", 
    "профессиональные услуги", "юрист", "ремонтник", "айти помощь", "professional services", "lawyer", "it support", 
    "handyman service", "професійні послуги", "it підтримка", "майстер"
  ],

  // 4. Business (Broad)
  business: [
    "business", "бизнес и услуги", "ремонт", "починить", "repair", "service", "ремонт телефона", "ремонт смартфонов", 
    "phone repair", "smartphone service", "ремонт ноутбуков", "ремонт пк", "laptop repair", "computer repair", 
    "ремонт техники", "ремонт бытовой техники", "appliance repair", "сантехник", "plumbing", "электрик", "electrician", 
    "мастер на час", "handyman", "строительство", "строитель", "construction", "builder", "ремонт квартир", "renovation", 
    "уборка", "клининг", "cleaning", "вывоз мусора", "junk removal", "фотограф", "фото", "photographer", "видеограф", 
    "видео съемка", "videographer", "design", "дизайн", "graphic design", "smm", "соцсети", "social media", "маникюр", 
    "ногти", "nails", "manicure", "парикмахер", "стрижка", "hair", "тату", "tattoo", "репетитор", "tutor", "курсы", 
    "courses", "сайты", "website", "web", "боты", "telegram bot", "реклама", "ads", "advertising", "грузоперевозки", 
    "доставка", "delivery", "shipping", "такси", "taxi", "юрист", "lawyer", "legal", "бухгалтер", "accountant", 
    "переводы", "translation"
  ],

  // 5. Kids
  kids: [
    "kids", "детский мир", "детское", "для детей", "детская одежда", "children clothes", "детская обувь", "игрушки", 
    "toys", "конструктор", "lego", "коляска", "stroller", "візочок", "кроватка", "crib", "ліжечко", "стульчик для кормления", 
    "детское питание", "baby food", "подгузники", "diapers", "автокресло", "car seat", "люлька", "carrier"
  ],

  // 6. Realty
  realty: [
    "realty", "недвижимость", "квартира", "apartment", "дом", "house", "комната", "room", "аренда", "rent", "снять", 
    "сдам", "продажа", "купить", "продам", "sell", "коммерческая недвижимость", "офис", "гараж", "garage", "real estate"
  ],

  // 7. Auto
  auto: [
    "auto", "авто", "машина", "car", "купить авто", "продам авто", "bmw", "mercedes", "audi", "vw", "volkswagen", 
    "toyota", "honda", "hyundai", "kia", "ford", "opel", "skoda", "renault", "peugeot", "citroen", "volvo", "tesla", 
    "mazda", "nissan", "subaru", "fiat", "porsche", "lexus", "jeep", "land rover", "mitsubishi", "mini", "seat", "dacia"
  ],

  // 8. Autoparts
  autoparts: [
    "autoparts", "запчасти", "автозапчасти", "parts", "двигатель", "engine", "мотор", "ходовая", "кузов", "стекло", 
    "фара", "фары", "шины", "резина", "колеса", "тормоза", "электрика", "tuning", "тюнинг"
  ],

  // 9. Jobs
  jobs: [
    "jobs", "работа", "job", "полная занятость", "full time", "частичная занятость", "part time", "подработка", 
    "freelance", "вакансия", "требуется", "ищу работу", "работник", "заработок", "доставка", "курьер", "водитель"
  ],

  // 10. Pets
  pets: [
    "pets", "животные", "собаки", "dog", "кошки", "cat", "рыбки", "fish", "птицы", "birds", "кролики", "rabbit", 
    "хомяк", "hamster", "товары для животных", "корм", "клетки", "груминг", "grooming"
  ],

  // 11. Furniture
  furniture: [
    "furniture", "мебель", "диван", "sofa", "кровать", "bed", "стол", "table", "стул", "chair", "шкаф", "wardrobe", 
    "кухня", "kitchen furniture", "матрас", "mattress"
  ],

  // 12. Home & Garden
  home_garden: [
    "home_garden", "дом и сад", "дом", "сад", "home", "garden", "инструменты", "tools", "интерьер", "декор", 
    "растения", "plants", "садовые товары", "садовый инвентарь", "строительные материалы", "бетон", "плитка", 
    "лампы", "свет"
  ],

  // 13. Electronics
  electronics: [
    "electronics", "электроника", "телефон", "смартфон", "phone", "ноутбук", "laptop", "компьютер", "pc", "планшет", 
    "tablet", "телевизор", "tv", "игровая приставка", "консоль", "console", "наушники", "headphones", "колонка", 
    "speaker", "фотоаппарат", "camera", "iphone", "iphone 12", "iphone 13", "iphone 14", "iphone 15", "pro", "max", 
    "samsung", "samsung s20", "samsung s21", "samsung s22", "samsung a52", "samsung a54", "xiaomi", "redmi note 8", 
    "redmi note 9", "redmi note 10 pro", "poco x3", "poco x5", "huawei p30", "huawei p40", "huawei mate", 
    "google pixel", "oneplus 8", "oneplus 9", "oneplus nord", "macbook air", "macbook pro", "lenovo thinkpad", 
    "lenovo ideapad", "asus vivobook", "asus rog", "hp pavilion", "dell inspiron", "playstation 4", "ps4", 
    "playstation 5", "ps5", "xbox one", "xbox series x", "nintendo switch", "ай"
  ],

  // 14. Fashion
  fashion: [
    "fashion", "мода и стиль", "одежда", "clothes", "мужское", "женское", "детское", "обувь", "shoes", "аксессуары", 
    "куртка", "пальто", "спортивная одежда", "сумка", "кошелек"
  ],

  // 15. Hobby & Sport
  hobby_sport: [
    "hobby_sport", "хобби и спорт", "спорт", "спортивные товары", "спорттовары", "спортзал", "gym", "велосипед", 
    "bike", "гитара", "guitar", "фортепиано", "piano", "музыкальные инструменты", "книги", "books", "настольные игры", 
    "билеты", "tickets", "антиквариат"
  ],

  // 16. Free
  free: [
    "free", "отдам бесплатно", "бесплатно", "отдам", "для нуждающихся", "заберите", "отдам даром"
  ],

  // 17. Exchange
  exchange: [
    "exchange", "обмен", "обменяю", "бартер", "trade"
  ]
};

/**
 * Расширяет поисковый запрос синонимами
 * @param {string} term 
 * @returns {string} - строка для поиска (term | synonym1 | synonym2)
 */
export function expandSearchTerm(term) {
  if (!term) return [];
  const lowerTerm = String(term).toLowerCase().trim();
  const synonyms = SYNONYMS[lowerTerm] || [];
  
  // Возвращаем массив уникальных терминов (оригинал + синонимы)
  return Array.from(new Set([lowerTerm, ...synonyms])); 
}

/**
 * Пытается определить категорию по поисковому запросу
 * @param {string} term 
 * @returns {string|null} - ключ категории или null
 */
export function detectCategory(term) {
  if (!term) return null;
  const lowerTerm = String(term).toLowerCase().trim();
  
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
  const isUkrainian = (str) => /[іІїЇєЄ]/.test(str); // Ukrainian-specific letters
  const isRussian = (str) => isCyrillic(str) && !isUkrainian(str);
  const isLatin = (str) => /^[a-zA-Z\s]+$/.test(str);
  
  // 1. Ищем совпадения в ключевых словах категорий
  for (const [catKey, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matched = keywords.filter(k => {
      const startsWithTerm = k.startsWith(lowerTerm);
      if (!startsWithTerm) return false;
      
      // Show suggestions based on interface language
      if (lang === 'ua') {
        // For Ukrainian: show Ukrainian words (with і,ї,є) OR Russian if no UA equivalent
        return isCyrillic(k);
      } else if (lang === 'ru') {
        // For Russian: show Russian words (no і,ї,є)
        return isRussian(k) || (isCyrillic(k) && !isUkrainian(k));
      } else if (lang === 'en') {
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
          if (lang === 'ua' && isCyrillic(s)) {
              suggestions.push({ text: s, type: 'synonym' });
          } else if (lang === 'ru' && (isRussian(s) || (isCyrillic(s) && !isUkrainian(s)))) {
              suggestions.push({ text: s, type: 'synonym' });
          } else if (lang === 'en' && isLatin(s)) {
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
