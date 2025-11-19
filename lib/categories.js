// lib/categories.js
// Общий список категорий для скролла и формы создания

export const CATEGORY_DEFS = [
  {
    key: "kids",
    icon: "🧸",
    ua: "Дитячий світ",
    ru: "Детский мир",
    en: "Kids & babies",
    labelKey: "cat_kids",
    filters: [
      {
        key: "subtype",
        label: { ru: "Тип товара", ua: "Тип товару", en: "Type" },
        type: "select",
        options: [
          { value: "clothing", label: { ru: "Одежда", ua: "Одяг", en: "Clothing" } },
          { value: "toys", label: { ru: "Игрушки", ua: "Іграшки", en: "Toys" } },
          { value: "transport", label: { ru: "Транспорт", ua: "Транспорт", en: "Transport" } },
          { value: "books", label: { ru: "Книги", ua: "Книги", en: "Books" } },
          { value: "food", label: { ru: "Питание", ua: "Харчування", en: "Food" } },
        ],
      },
      {
        key: "age",
        label: { ru: "Возраст", ua: "Вік", en: "Age" },
        type: "select",
        options: [
          { value: "0-6m", label: { ru: "0–6 мес", ua: "0–6 міс", en: "0–6 m" } },
          { value: "6-12m", label: { ru: "6–12 мес", ua: "6–12 міс", en: "6–12 m" } },
          { value: "1-2y", label: { ru: "1–2 года", ua: "1–2 роки", en: "1–2 y" } },
          { value: "2-4y", label: { ru: "2–4 года", ua: "2–4 роки", en: "2–4 y" } },
          { value: "4-6y", label: { ru: "4–6 лет", ua: "4–6 років", en: "4–6 y" } },
          { value: "6plus", label: { ru: "6+ лет", ua: "6+ років", en: "6+ y" } },
        ],
      },
      {
        key: "gender",
        label: { ru: "Пол", ua: "Стать", en: "Gender" },
        type: "select",
        options: [
          { value: "boy", label: { ru: "Мальчик", ua: "Хлопчик", en: "Boy" } },
          { value: "girl", label: { ru: "Девочка", ua: "Дівчинка", en: "Girl" } },
          { value: "unisex", label: { ru: "Унисекс", ua: "Унісекс", en: "Unisex" } },
        ],
      },
      {
        key: "condition",
        label: { ru: "Состояние", ua: "Стан", en: "Condition" },
        type: "select",
        options: [
          { value: "new", label: { ru: "Новое", ua: "Нове", en: "New" } },
          { value: "used", label: { ru: "Б/у", ua: "Б/в", en: "Used" } },
        ],
      },
    ],
  },
  {
    key: "realty",
    icon: "🏠",
    ua: "Нерухомість",
    ru: "Недвижимость",
    en: "Real estate",
    labelKey: "cat_realty",
    filters: [
      {
        key: "subtype",
        label: { ru: "Тип", ua: "Тип", en: "Type" },
        type: "select",
        options: [
          { value: "apartment", label: { ru: "Квартира", ua: "Квартира", en: "Apartment" } },
          { value: "house", label: { ru: "Дом", ua: "Будинок", en: "House" } },
          { value: "room", label: { ru: "Комната", ua: "Кімната", en: "Room" } },
          { value: "studio", label: { ru: "Студия", ua: "Студія", en: "Studio" } },
          { value: "commercial", label: { ru: "Коммерческая", ua: "Комерційна", en: "Commercial" } },
          { value: "garage", label: { ru: "Гараж", ua: "Гараж", en: "Garage" } },
        ],
      },
      {
        key: "rooms",
        label: { ru: "Количество комнат", ua: "Кількість кімнат", en: "Rooms" },
        type: "number",
      },
      {
        key: "area",
        label: { ru: "Площадь (м²)", ua: "Площа (м²)", en: "Area (m²)" },
        type: "range", // min/max
      },
      {
        key: "floor",
        label: { ru: "Этаж", ua: "Поверх", en: "Floor" },
        type: "number",
      },
      {
        key: "total_floors",
        label: { ru: "Этажность дома", ua: "Поверховість будинку", en: "Total floors" },
        type: "number",
      },
      {
        key: "heating",
        label: { ru: "Отопление", ua: "Опалення", en: "Heating" },
        type: "select",
        options: [
          { value: "central", label: { ru: "Центральное", ua: "Центральне", en: "Central" } },
          { value: "autonomous", label: { ru: "Автономное", ua: "Автономне", en: "Autonomous" } },
        ],
      },
      {
        key: "furnished",
        label: { ru: "Мебель", ua: "Меблі", en: "Furnished" },
        type: "boolean",
      },
      {
        key: "pets_allowed",
        label: { ru: "Животные разрешены", ua: "Тварини дозволені", en: "Pets allowed" },
        type: "boolean",
      },
      {
        key: "deposit",
        label: { ru: "Залог", ua: "Застава", en: "Deposit" },
        type: "boolean",
      },
      {
        key: "utilities_included",
        label: { ru: "Коммунальные включены", ua: "Комунальні включені", en: "Utilities included" },
        type: "boolean",
      },
    ],
  },
  {
    key: "auto",
    icon: "🚗",
    ua: "Авто",
    ru: "Автомобили",
    en: "Cars",
    labelKey: "cat_auto",
    filters: [
      {
        key: "brand",
        label: { ru: "Марка", ua: "Марка", en: "Brand" },
        type: "text",
      },
      {
        key: "model",
        label: { ru: "Модель", ua: "Модель", en: "Model" },
        type: "text",
      },
      {
        key: "year",
        label: { ru: "Год выпуска", ua: "Рік випуску", en: "Year" },
        type: "range",
      },
      {
        key: "mileage",
        label: { ru: "Пробег (км)", ua: "Пробіг (км)", en: "Mileage (km)" },
        type: "range",
      },
      {
        key: "engine_type",
        label: { ru: "Тип двигателя", ua: "Тип двигуна", en: "Engine type" },
        type: "select",
        options: [
          { value: "gas", label: { ru: "Газ", ua: "Газ", en: "Gas" } },
          { value: "petrol", label: { ru: "Бензин", ua: "Бензин", en: "Petrol" } },
          { value: "diesel", label: { ru: "Дизель", ua: "Дизель", en: "Diesel" } },
          { value: "hybrid", label: { ru: "Гибрид", ua: "Гібрид", en: "Hybrid" } },
          { value: "electric", label: { ru: "Электро", ua: "Електро", en: "Electric" } },
        ],
      },
      {
        key: "transmission",
        label: { ru: "Коробка передач", ua: "Коробка передач", en: "Transmission" },
        type: "select",
        options: [
          { value: "at", label: { ru: "Автомат", ua: "Автомат", en: "Automatic" } },
          { value: "mt", label: { ru: "Механика", ua: "Механіка", en: "Manual" } },
          { value: "robot", label: { ru: "Робот", ua: "Робот", en: "Robot" } },
        ],
      },
      {
        key: "drive_type",
        label: { ru: "Привод", ua: "Привід", en: "Drive type" },
        type: "select",
        options: [
          { value: "fwd", label: { ru: "Передний", ua: "Передній", en: "FWD" } },
          { value: "rwd", label: { ru: "Задний", ua: "Задній", en: "RWD" } },
          { value: "awd", label: { ru: "Полный", ua: "Повний", en: "AWD" } },
        ],
      },
      {
        key: "color",
        label: { ru: "Цвет", ua: "Колір", en: "Color" },
        type: "text",
      },
      {
        key: "condition_details", // conflict with global condition
        label: { ru: "Состояние авто", ua: "Стан авто", en: "Car condition" },
        type: "select",
        options: [
          { value: "not_broken", label: { ru: "Не битый", ua: "Не битий", en: "Not broken" } },
          { value: "broken", label: { ru: "Битый", ua: "Битий", en: "Broken" } },
        ],
      },
      {
        key: "customs_cleared",
        label: { ru: "Растаможен", ua: "Розмитнений", en: "Customs cleared" },
        type: "boolean",
      },
    ],
  },
  {
    key: "autoparts",
    icon: "🛠️",
    ua: "Запчастини",
    ru: "Запчасти",
    en: "Auto parts",
    labelKey: "cat_autoparts",
    filters: [
      {
        key: "subtype",
        label: { ru: "Тип", ua: "Тип", en: "Type" },
        type: "select",
        options: [
          { value: "engine", label: { ru: "Двигатель", ua: "Двигун", en: "Engine" } },
          { value: "chassis", label: { ru: "Ходовая", ua: "Ходова", en: "Chassis" } },
          { value: "body", label: { ru: "Кузов", ua: "Кузов", en: "Body" } },
          { value: "electric", label: { ru: "Электрика", ua: "Електрика", en: "Electric" } },
          { value: "tuning", label: { ru: "Тюнинг", ua: "Тюнінг", en: "Tuning" } },
        ],
      },
      {
        key: "compatibility_brand",
        label: { ru: "Марка авто", ua: "Марка авто", en: "Car brand" },
        type: "text",
      },
      {
        key: "compatibility_model",
        label: { ru: "Модель авто", ua: "Модель авто", en: "Car model" },
        type: "text",
      },
      {
        key: "condition",
        label: { ru: "Состояние", ua: "Стан", en: "Condition" },
        type: "select",
        options: [
          { value: "new", label: { ru: "Новое", ua: "Нове", en: "New" } },
          { value: "used", label: { ru: "Б/у", ua: "Б/в", en: "Used" } },
        ],
      },
      {
        key: "origin",
        label: { ru: "Производитель", ua: "Виробник", en: "Origin" },
        type: "select",
        options: [
          { value: "original", label: { ru: "Оригинал", ua: "Оригінал", en: "Original" } },
          { value: "analog", label: { ru: "Аналог", ua: "Аналог", en: "Analog" } },
        ],
      },
    ],
  },
  {
    key: "jobs",
    icon: "💼",
    ua: "Робота",
    ru: "Работа",
    en: "Jobs",
    labelKey: "cat_jobs",
    filters: [
      {
        key: "employment_type",
        label: { ru: "Тип занятости", ua: "Тип зайнятості", en: "Employment type" },
        type: "select",
        options: [
          { value: "full", label: { ru: "Полная", ua: "Повна", en: "Full-time" } },
          { value: "part", label: { ru: "Частичная", ua: "Часткова", en: "Part-time" } },
          { value: "gig", label: { ru: "Подработка", ua: "Підробіток", en: "Gig" } },
        ],
      },
      {
        key: "format",
        label: { ru: "Формат", ua: "Формат", en: "Format" },
        type: "select",
        options: [
          { value: "office", label: { ru: "Офис", ua: "Офіс", en: "Office" } },
          { value: "remote", label: { ru: "Удаленка", ua: "Віддалено", en: "Remote" } },
          { value: "hybrid", label: { ru: "Гибрид", ua: "Гібрид", en: "Hybrid" } },
        ],
      },
      {
        key: "experience",
        label: { ru: "Опыт", ua: "Досвід", en: "Experience" },
        type: "select",
        options: [
          { value: "none", label: { ru: "Без опыта", ua: "Без досвіду", en: "No experience" } },
          { value: "1plus", label: { ru: "1+ год", ua: "1+ рік", en: "1+ year" } },
          { value: "3plus", label: { ru: "3+ года", ua: "3+ роки", en: "3+ years" } },
        ],
      },
      {
        key: "salary",
        label: { ru: "Зарплата", ua: "Зарплата", en: "Salary" },
        type: "range",
      },
    ],
  },
  {
    key: "pets",
    icon: "🐾",
    ua: "Тварини",
    ru: "Животные",
    en: "Pets",
    labelKey: "cat_pets",
    filters: [
      {
        key: "subtype",
        label: { ru: "Тип животного", ua: "Тип тварини", en: "Animal type" },
        type: "select",
        options: [
          { value: "dog", label: { ru: "Собака", ua: "Собака", en: "Dog" } },
          { value: "cat", label: { ru: "Кот", ua: "Кіт", en: "Cat" } },
          { value: "bird", label: { ru: "Птица", ua: "Птах", en: "Bird" } },
          { value: "reptile", label: { ru: "Рептилия", ua: "Рептилія", en: "Reptile" } },
          { value: "fish", label: { ru: "Рыба", ua: "Риба", en: "Fish" } },
        ],
      },
      {
        key: "breed",
        label: { ru: "Порода", ua: "Порода", en: "Breed" },
        type: "text",
      },
      {
        key: "age",
        label: { ru: "Возраст", ua: "Вік", en: "Age" },
        type: "text", // Simple text input for flexibility
      },
      {
        key: "documents",
        label: { ru: "Документы", ua: "Документи", en: "Documents" },
        type: "boolean",
      },
      {
        key: "vaccinations",
        label: { ru: "Прививки", ua: "Щеплення", en: "Vaccinations" },
        type: "boolean",
      },
      {
        key: "gender",
        label: { ru: "Пол", ua: "Стать", en: "Gender" },
        type: "select",
        options: [
          { value: "male", label: { ru: "Мальчик", ua: "Хлопчик", en: "Male" } },
          { value: "female", label: { ru: "Девочка", ua: "Дівчинка", en: "Female" } },
        ],
      },
    ],
  },

  {
    key: "furniture",
    icon: "🛋",
    ua: "Меблі",
    ru: "Мебель",
    en: "Furniture",
    labelKey: "cat_furniture",
    filters: [
      // Reusing Home & Garden filters as they are similar or same
      {
        key: "condition",
        label: { ru: "Состояние", ua: "Стан", en: "Condition" },
        type: "select",
        options: [
          { value: "new", label: { ru: "Новое", ua: "Нове", en: "New" } },
          { value: "used", label: { ru: "Б/у", ua: "Б/в", en: "Used" } },
        ],
      },
    ],
  },

  {
    key: "home_garden",
    icon: "🪴",
    ua: "Дім і сад",
    ru: "Дом и сад",
    en: "Home & garden",
    labelKey: "cat_home_garden",
    filters: [
      {
        key: "subtype",
        label: { ru: "Тип", ua: "Тип", en: "Type" },
        type: "select",
        options: [
          { value: "furniture", label: { ru: "Мебель", ua: "Меблі", en: "Furniture" } },
          { value: "appliances", label: { ru: "Техника", ua: "Техніка", en: "Appliances" } },
          { value: "interior", label: { ru: "Интерьер", ua: "Інтер'єр", en: "Interior" } },
          { value: "garden", label: { ru: "Сад", ua: "Сад", en: "Garden" } },
          { value: "tools", label: { ru: "Инструменты", ua: "Інструменти", en: "Tools" } },
        ],
      },
      {
        key: "purpose",
        label: { ru: "Назначение", ua: "Призначення", en: "Purpose" },
        type: "select",
        options: [
          { value: "kitchen", label: { ru: "Кухня", ua: "Кухня", en: "Kitchen" } },
          { value: "bedroom", label: { ru: "Спальня", ua: "Спальня", en: "Bedroom" } },
          { value: "bathroom", label: { ru: "Ванная", ua: "Ванна", en: "Bathroom" } },
          { value: "living_room", label: { ru: "Гостиная", ua: "Вітальня", en: "Living room" } },
        ],
      },
      {
        key: "condition",
        label: { ru: "Состояние", ua: "Стан", en: "Condition" },
        type: "select",
        options: [
          { value: "new", label: { ru: "Новое", ua: "Нове", en: "New" } },
          { value: "used", label: { ru: "Б/у", ua: "Б/в", en: "Used" } },
        ],
      },
      {
        key: "material",
        label: { ru: "Материал", ua: "Матеріал", en: "Material" },
        type: "text",
      },
    ],
  },
  {
    key: "electronics",
    icon: "📱",
    ua: "Електроніка",
    ru: "Электроника",
    en: "Electronics",
    labelKey: "cat_electronics",
    filters: [
      {
        key: "subtype",
        label: { ru: "Категория", ua: "Категорія", en: "Category" },
        type: "select",
        options: [
          { value: "phones", label: { ru: "Телефоны", ua: "Телефони", en: "Phones" } },
          { value: "laptops", label: { ru: "Ноутбуки", ua: "Ноутбуки", en: "Laptops" } },
          { value: "pc", label: { ru: "ПК", ua: "ПК", en: "PC" } },
          { value: "tv", label: { ru: "ТВ", ua: "ТВ", en: "TV" } },
          { value: "photo", label: { ru: "Фото", ua: "Фото", en: "Photo" } },
          { value: "audio", label: { ru: "Аудио", ua: "Аудіо", en: "Audio" } },
          { value: "games", label: { ru: "Игры", ua: "Ігри", en: "Games" } },
        ],
      },
      {
        key: "brand",
        label: { ru: "Бренд", ua: "Бренд", en: "Brand" },
        type: "text",
      },
      {
        key: "memory",
        label: { ru: "Память (ГБ)", ua: "Пам'ять (ГБ)", en: "Memory (GB)" },
        type: "select",
        options: [
          { value: "64", label: { ru: "64", ua: "64", en: "64" } },
          { value: "128", label: { ru: "128", ua: "128", en: "128" } },
          { value: "256", label: { ru: "256", ua: "256", en: "256" } },
          { value: "512", label: { ru: "512", ua: "512", en: "512" } },
        ],
      },
      {
        key: "condition",
        label: { ru: "Состояние", ua: "Стан", en: "Condition" },
        type: "select",
        options: [
          { value: "new", label: { ru: "Новое", ua: "Нове", en: "New" } },
          { value: "used", label: { ru: "Б/у", ua: "Б/в", en: "Used" } },
        ],
      },
      {
        key: "warranty",
        label: { ru: "Гарантия", ua: "Гарантія", en: "Warranty" },
        type: "boolean",
      },
    ],
  },
  {
    key: "business",
    icon: "📊",
    ua: "Бізнес та послуги",
    ru: "Бизнес и услуги",
    en: "Business & services",
    labelKey: "cat_business",
    filters: [
      {
        key: "service_type",
        label: { ru: "Тип услуги", ua: "Тип послуги", en: "Service type" },
        type: "select",
        options: [
          // 1. Ремонт и обслуживание
          { value: "phone_repair", label: { ru: "Ремонт телефонов", ua: "Ремонт телефонів", en: "Phone repair" } },
          { value: "laptop_repair", label: { ru: "Ремонт ноутбуков", ua: "Ремонт ноутбуків", en: "Laptop repair" } },
          { value: "appliance_repair", label: { ru: "Ремонт бытовой техники", ua: "Ремонт побутової техніки", en: "Appliance repair" } },
          { value: "fridge_repair", label: { ru: "Ремонт холодильников", ua: "Ремонт холодильників", en: "Refrigerator repair" } },
          { value: "washing_machine_repair", label: { ru: "Ремонт стиральных машин", ua: "Ремонт пральних машин", en: "Washing machine repair" } },
          { value: "pc_help", label: { ru: "Компьютерная помощь", ua: "Комп'ютерна допомога", en: "PC help" } },
          { value: "plumber", label: { ru: "Сантехник", ua: "Сантехнік", en: "Plumber" } },
          { value: "electrician", label: { ru: "Электрик", ua: "Електрик", en: "Electrician" } },
          { value: "handyman", label: { ru: "Мастер на час", ua: "Майстер на годину", en: "Handyman" } },
          { value: "furniture_assembly", label: { ru: "Сборка мебели", ua: "Збирання меблів", en: "Furniture assembly" } },
          { value: "furniture_repair", label: { ru: "Ремонт мебели", ua: "Ремонт меблів", en: "Furniture repair" } },
          { value: "auto_repair", label: { ru: "Ремонт авто", ua: "Ремонт авто", en: "Car repair" } },
          { value: "moto_repair", label: { ru: "Ремонт мото", ua: "Ремонт мото", en: "Moto repair" } },
          { value: "body_work", label: { ru: "Кузовные работы", ua: "Кузовні роботи", en: "Body work" } },
          { value: "ac_repair", label: { ru: "Ремонт кондиционеров", ua: "Ремонт кондиціонерів", en: "AC repair" } },
          { value: "ac_install", label: { ru: "Установка кондиционеров", ua: "Встановлення кондиціонерів", en: "AC installation" } },
          { value: "network_setup", label: { ru: "Настройка роутеров и интернета", ua: "Налаштування роутерів та інтернету", en: "Network setup" } },

          // 2. Строительство и ремонт
          { value: "apartment_renovation", label: { ru: "Ремонт квартир", ua: "Ремонт квартир", en: "Apartment renovation" } },
          { value: "painting", label: { ru: "Малярные работы", ua: "Малярні роботи", en: "Painting" } },
          { value: "plastering", label: { ru: "Штукатурка и шпаклёвка", ua: "Штукатурка та шпаклівка", en: "Plastering" } },
          { value: "tiling", label: { ru: "Плитка", ua: "Плитка", en: "Tiling" } },
          { value: "electrical_install", label: { ru: "Электромонтаж", ua: "Електромонтаж", en: "Electrical installation" } },
          { value: "plumbing_work", label: { ru: "Сантехнические работы", ua: "Сантехнічні роботи", en: "Plumbing work" } },
          { value: "floor_screed", label: { ru: "Стяжка полов", ua: "Стяжка підлоги", en: "Floor screed" } },
          { value: "roofing", label: { ru: "Кровельные работы", ua: "Покрівельні роботи", en: "Roofing" } },
          { value: "facade_work", label: { ru: "Фасадные работы", ua: "Фасадні роботи", en: "Facade work" } },

          // 3. Услуги для дома
          { value: "cleaning", label: { ru: "Уборка квартир", ua: "Прибирання квартир", en: "Apartment cleaning" } },
          { value: "general_cleaning", label: { ru: "Генеральная уборка", ua: "Генеральне прибирання", en: "Deep cleaning" } },
          { value: "window_cleaning", label: { ru: "Мытьё окон", ua: "Миття вікон", en: "Window cleaning" } },
          { value: "trash_removal", label: { ru: "Вывоз мусора", ua: "Вивіз сміття", en: "Trash removal" } },
          { value: "lawn_mowing", label: { ru: "Стрижка газонов", ua: "Стрижка газонів", en: "Lawn mowing" } },
          { value: "landscaping", label: { ru: "Ландшафтные работы", ua: "Ландшафтні роботи", en: "Landscaping" } },
          { value: "garden_care", label: { ru: "Уход за садом", ua: "Догляд за садом", en: "Garden care" } },
          { value: "moving", label: { ru: "Переезды", ua: "Переїзди", en: "Moving" } },
          { value: "movers", label: { ru: "Грузчики", ua: "Вантажники", en: "Movers" } },

          // 4. Фото, видео, дизайн
          { value: "photographer", label: { ru: "Фотограф", ua: "Фотограф", en: "Photographer" } },
          { value: "videographer", label: { ru: "Видеограф", ua: "Відеограф", en: "Videographer" } },
          { value: "video_editing", label: { ru: "Монтаж видео", ua: "Монтаж відео", en: "Video editing" } },
          { value: "design", label: { ru: "Дизайн (лого, баннеры)", ua: "Дизайн (лого, банери)", en: "Design" } },
          { value: "3d_motion", label: { ru: "3D / motion", ua: "3D / motion", en: "3D / motion" } },
          { value: "retouching", label: { ru: "Ретушь фотографий", ua: "Ретуш фотографій", en: "Photo retouching" } },
          { value: "smm", label: { ru: "SMM менеджмент", ua: "SMM менеджмент", en: "SMM management" } },

          // 5. Красота и здоровье
          { value: "manicure", label: { ru: "Маникюр", ua: "Манікюр", en: "Manicure" } },
          { value: "pedicure", label: { ru: "Педикюр", ua: "Педикюр", en: "Pedicure" } },
          { value: "hair_styling", label: { ru: "Укладка / окрашивание", ua: "Укладання / фарбування", en: "Hair styling" } },
          { value: "barber", label: { ru: "Барбер", ua: "Барбер", en: "Barber" } },
          { value: "cosmetologist", label: { ru: "Косметолог", ua: "Косметолог", en: "Cosmetologist" } },
          { value: "lashmaker", label: { ru: "Лашмейкер", ua: "Лашмейкер", en: "Lashmaker" } },
          { value: "massage", label: { ru: "Массажист", ua: "Масажист", en: "Massage therapist" } },
          { value: "tattoo", label: { ru: "Тату мастер", ua: "Тату майстер", en: "Tattoo artist" } },
          { value: "permanent_makeup", label: { ru: "Перманентный макияж", ua: "Перманентний макіяж", en: "Permanent makeup" } },

          // 6. Обучение
          { value: "tutor_english", label: { ru: "Репетитор английского", ua: "Репетитор англійської", en: "English tutor" } },
          { value: "tutor_german", label: { ru: "Репетитор немецкого", ua: "Репетитор німецької", en: "German tutor" } },
          { value: "exam_prep", label: { ru: "Подготовка к экзаменам", ua: "Підготовка до іспитів", en: "Exam prep" } },
          { value: "music_lessons", label: { ru: "Музыкальные уроки", ua: "Музичні уроки", en: "Music lessons" } },
          { value: "coding_courses", label: { ru: "Курсы программирования", ua: "Курси програмування", en: "Coding courses" } },
          { value: "drawing_teacher", label: { ru: "Учитель по рисованию", ua: "Вчитель малювання", en: "Drawing teacher" } },
          { value: "design_training", label: { ru: "Обучение 3D / дизайну", ua: "Навчання 3D / дизайну", en: "Design training" } },

          // 7. IT и digital
          { value: "web_dev", label: { ru: "Создание сайтов", ua: "Створення сайтів", en: "Web development" } },
          { value: "bot_dev", label: { ru: "Разработка Telegram-ботов", ua: "Розробка Telegram-ботів", en: "Bot development" } },
          { value: "miniapp_dev", label: { ru: "Разработка mini-apps", ua: "Розробка mini-apps", en: "Mini-app development" } },
          { value: "ads_setup", label: { ru: "Настройка рекламы", ua: "Налаштування реклами", en: "Ads setup" } },
          { value: "seo", label: { ru: "SEO", ua: "SEO", en: "SEO" } },
          { value: "tech_support", label: { ru: "Техподдержка", ua: "Техпідтримка", en: "Tech support" } },
          { value: "crm_setup", label: { ru: "Настройка CRM", ua: "Налаштування CRM", en: "CRM setup" } },

          // 8. Транспорт и автоуслуги
          { value: "taxi", label: { ru: "Такси", ua: "Таксі", en: "Taxi" } },
          { value: "passenger_transport", label: { ru: "Пассажирские перевозки", ua: "Пасажирські перевезення", en: "Passenger transport" } },
          { value: "delivery", label: { ru: "Доставка", ua: "Доставка", en: "Delivery" } },
          { value: "tow_truck", label: { ru: "Эвакуатор", ua: "Евакуатор", en: "Tow truck" } },
          { value: "cargo_transport", label: { ru: "Грузоперевозки", ua: "Вантажоперевезення", en: "Cargo transport" } },
          { value: "auto_service", label: { ru: "Услуги автосервиса", ua: "Послуги автосервісу", en: "Auto service" } },

          // 9. Животные
          { value: "grooming", label: { ru: "Груминг", ua: "Грумінг", en: "Grooming" } },
          { value: "pet_sitting", label: { ru: "Передержка", ua: "Перетримка", en: "Pet sitting" } },
          { value: "dog_training", label: { ru: "Дрессировка", ua: "Дресирування", en: "Dog training" } },
          { value: "vet_home", label: { ru: "Ветеринар на дом", ua: "Ветеринар додому", en: "Vet home visit" } },

          // 10. Ивенты и развлечения
          { value: "event_org", label: { ru: "Организация мероприятий", ua: "Організація заходів", en: "Event organization" } },
          { value: "host", label: { ru: "Ведущий", ua: "Ведучий", en: "Host" } },
          { value: "dj", label: { ru: "Диджей", ua: "Діджей", en: "DJ" } },
          { value: "photo_zone", label: { ru: "Фото-зоны", ua: "Фото-зони", en: "Photo zones" } },
          { value: "equipment_rental", label: { ru: "Прокат оборудования", ua: "Прокат обладнання", en: "Equipment rental" } },
          { value: "animators", label: { ru: "Детские аниматоры", ua: "Дитячі аніматори", en: "Animators" } },

          // 11. Финансы и юридические
          { value: "legal_advice", label: { ru: "Юридические консультации", ua: "Юридичні консультації", en: "Legal advice" } },
          { value: "accountant", label: { ru: "Бухгалтер", ua: "Бухгалтер", en: "Accountant" } },
          { value: "business_reg", label: { ru: "Регистрация бизнеса", ua: "Реєстрація бізнесу", en: "Business registration" } },
          { value: "tax_advice", label: { ru: "Налоговые консультации", ua: "Податкові консультації", en: "Tax advice" } },
          { value: "translation", label: { ru: "Перевод документов", ua: "Переклад документів", en: "Translation" } },

          // 12. Для бизнеса
          { value: "b2b_rental", label: { ru: "Аренда оборудования", ua: "Оренда обладнання", en: "Equipment rental (B2B)" } },
          { value: "printing", label: { ru: "Полиграфия", ua: "Поліграфія", en: "Printing" } },
          { value: "business_cards", label: { ru: "Печать визиток / наклеек", ua: "Друк візиток / наклейок", en: "Business cards" } },
          { value: "courier", label: { ru: "Курьерские услуги", ua: "Кур'єрські послуги", en: "Courier services" } },
          { value: "hr", label: { ru: "HR / рекрутинг", ua: "HR / рекрутинг", en: "HR / Recruiting" } },
          { value: "marketing", label: { ru: "Маркетинг", ua: "Маркетинг", en: "Marketing" } },
        ],
      },
      {
        key: "location_type",
        label: { ru: "Место оказания", ua: "Місце надання", en: "Location type" },
        type: "select",
        options: [
          { value: "onsite", label: { ru: "Выезд", ua: "Виїзд", en: "On-site" } },
          { value: "studio", label: { ru: "В студии", ua: "В студії", en: "In studio" } },
        ],
      },
      {
        key: "price_type",
        label: { ru: "Цена", ua: "Ціна", en: "Price" },
        type: "select",
        options: [
          { value: "fixed", label: { ru: "Фиксированная", ua: "Фіксована", en: "Fixed" } },
          { value: "negotiable", label: { ru: "По договоренности", ua: "За домовленістю", en: "Negotiable" } },
        ],
      },
    ],
  },
  {
    key: "fashion",
    icon: "👗",
    ua: "Мода і стиль",
    ru: "Мода и стиль",
    en: "Fashion & style",
    labelKey: "cat_fashion",
    filters: [
      {
        key: "condition",
        label: { ru: "Состояние", ua: "Стан", en: "Condition" },
        type: "select",
        options: [
          { value: "new", label: { ru: "Новое", ua: "Нове", en: "New" } },
          { value: "used", label: { ru: "Б/у", ua: "Б/в", en: "Used" } },
        ],
      },
    ],
  },
  {
    key: "hobby_sport",
    icon: "🎯",
    ua: "Хобі, відпочинок і спорт",
    ru: "Хобби, отдых и спорт",
    en: "Hobby, leisure & sport",
    labelKey: "cat_hobby_sport",
    filters: [
      {
        key: "subtype",
        label: { ru: "Тип товара", ua: "Тип товару", en: "Type" },
        type: "select",
        options: [
          { value: "music", label: { ru: "Муз. инструменты", ua: "Муз. інструменти", en: "Music instruments" } },
          { value: "sport", label: { ru: "Спорт", ua: "Спорт", en: "Sport" } },
          { value: "tourism", label: { ru: "Туризм", ua: "Туризм", en: "Tourism" } },
          { value: "leisure", label: { ru: "Досуг", ua: "Дозвілля", en: "Leisure" } },
        ],
      },
      {
        key: "subcategory",
        label: { ru: "Подкатегория", ua: "Підкатегорія", en: "Subcategory" },
        type: "text",
        placeholder: { ru: "Например: гитара, велосипед", ua: "Наприклад: гітара, велосипед", en: "E.g. guitar, bicycle" },
      },
      {
        key: "condition",
        label: { ru: "Состояние", ua: "Стан", en: "Condition" },
        type: "select",
        options: [
          { value: "new", label: { ru: "Новое", ua: "Нове", en: "New" } },
          { value: "used", label: { ru: "Б/у", ua: "Б/в", en: "Used" } },
        ],
      },
    ],
  },
  {
    key: "free",
    icon: "🎁",
    ua: "Віддам безкоштовно",
    ru: "Отдам бесплатно",
    en: "Give away free",
    labelKey: "cat_free",
    filters: [
      {
        key: "condition",
        label: { ru: "Состояние", ua: "Стан", en: "Condition" },
        type: "select",
        options: [
          { value: "new", label: { ru: "Новое", ua: "Нове", en: "New" } },
          { value: "used", label: { ru: "Б/у", ua: "Б/в", en: "Used" } },
        ],
      },
    ],
  },
  {
    key: "exchange",
    icon: "🔁",
    ua: "Обмін",
    ru: "Обмен",
    en: "Exchange",
    labelKey: "cat_exchange",
    filters: [
      {
        key: "exchange_offer",
        label: { ru: "Что отдаёшь", ua: "Що віддаєш", en: "What you offer" },
        type: "text",
      },
      {
        key: "exchange_request",
        label: { ru: "На что хочешь обменять", ua: "На що хочеш обміняти", en: "What you want" },
        type: "text",
      },
    ],
  },
];
