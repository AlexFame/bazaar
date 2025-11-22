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
          { value: "shoes", label: { ru: "Обувь", ua: "Взуття", en: "Shoes" } },
          { value: "toys", label: { ru: "Игрушки", ua: "Іграшки", en: "Toys" } },
          { value: "strollers", label: { ru: "Коляски", ua: "Візочки", en: "Strollers" } },
          { value: "furniture", label: { ru: "Мебель", ua: "Меблі", en: "Furniture" } },
          { value: "transport", label: { ru: "Транспорт", ua: "Транспорт", en: "Transport" } },
          { value: "food", label: { ru: "Питание", ua: "Харчування", en: "Food" } },
          { value: "books", label: { ru: "Книги", ua: "Книги", en: "Books" } },
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
          { value: "like_new", label: { ru: "Как новое", ua: "Як нове", en: "Like new" } },
          { value: "used", label: { ru: "Б/у", ua: "Б/в", en: "Used" } },
        ],
      },
      {
        key: "brand",
        label: { ru: "Бренд", ua: "Бренд", en: "Brand" },
        type: "text",
      },
      {
        key: "material",
        label: { ru: "Материал", ua: "Матеріал", en: "Material" },
        type: "text",
      },
      {
        key: "size",
        label: { ru: "Размер", ua: "Розмір", en: "Size" },
        type: "text",
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
          { value: "commercial", label: { ru: "Коммерческая", ua: "Комерційна", en: "Commercial" } },
          { value: "garage", label: { ru: "Гараж", ua: "Гараж", en: "Garage" } },
        ],
      },
      {
        key: "deal_type",
        label: { ru: "Сделка", ua: "Угода", en: "Deal type" },
        type: "select",
        options: [
            { value: "sale", label: { ru: "Продажа", ua: "Продаж", en: "Sale" } },
            { value: "rent", label: { ru: "Аренда", ua: "Оренда", en: "Rent" } },
            { value: "daily", label: { ru: "Посуточно", ua: "Подобово", en: "Daily rent" } },
        ]
      },
      {
        key: "area",
        label: { ru: "Площадь (м²)", ua: "Площа (м²)", en: "Area (m²)" },
        type: "range",
      },
      {
        key: "rooms",
        label: { ru: "Количество комнат", ua: "Кількість кімнат", en: "Rooms" },
        type: "select",
        options: [
            { value: "1", label: { ru: "1", ua: "1", en: "1" } },
            { value: "2", label: { ru: "2", ua: "2", en: "2" } },
            { value: "3", label: { ru: "3", ua: "3", en: "3" } },
            { value: "4plus", label: { ru: "4+", ua: "4+", en: "4+" } },
        ]
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
        key: "building_type",
        label: { ru: "Тип здания", ua: "Тип будинку", en: "Building type" },
        type: "select",
        options: [
            { value: "panel", label: { ru: "Панель", ua: "Панель", en: "Panel" } },
            { value: "brick", label: { ru: "Кирпич", ua: "Цегла", en: "Brick" } },
            { value: "block", label: { ru: "Блок", ua: "Блок", en: "Block" } },
        ]
      },
      {
        key: "heating",
        label: { ru: "Отопление", ua: "Опалення", en: "Heating" },
        type: "select",
        options: [
          { value: "central", label: { ru: "Центральное", ua: "Центральне", en: "Central" } },
          { value: "individual", label: { ru: "Индивидуальное", ua: "Індивідуальне", en: "Individual" } },
          { value: "gas", label: { ru: "Газ", ua: "Газ", en: "Gas" } },
          { value: "electric", label: { ru: "Электро", ua: "Електро", en: "Electric" } },
        ],
      },
      {
        key: "furnished",
        label: { ru: "Меблировка", ua: "Меблі", en: "Furnished" },
        type: "boolean",
      },
      {
        key: "bathroom",
        label: { ru: "Санузел", ua: "Санвузол", en: "Bathroom" },
        type: "select",
        options: [
            { value: "combined", label: { ru: "Совмещенный", ua: "Суміщений", en: "Combined" } },
            { value: "separated", label: { ru: "Раздельный", ua: "Роздільний", en: "Separated" } },
        ]
      },
      {
        key: "balcony",
        label: { ru: "Балкон", ua: "Балкон", en: "Balcony" },
        type: "boolean",
      },
      {
        key: "pets_allowed",
        label: { ru: "Животные разрешены", ua: "Тварини дозволені", en: "Pets allowed" },
        type: "boolean",
      },
      {
        key: "utilities_included",
        label: { ru: "Коммунальные включены", ua: "Комунальні включені", en: "Utilities included" },
        type: "boolean",
      },
      {
        key: "deposit",
        label: { ru: "Залог", ua: "Застава", en: "Deposit" },
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
        key: "fuel_type",
        label: { ru: "Тип топлива", ua: "Тип пального", en: "Fuel type" },
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
        label: { ru: "КПП", ua: "КПП", en: "Transmission" },
        type: "select",
        options: [
          { value: "automatic", label: { ru: "Автомат", ua: "Автомат", en: "Automatic" } },
          { value: "manual", label: { ru: "Механика", ua: "Механіка", en: "Manual" } },
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
        key: "body_type",
        label: { ru: "Тип кузова", ua: "Тип кузова", en: "Body type" },
        type: "select",
        options: [
            { value: "sedan", label: { ru: "Седан", ua: "Седан", en: "Sedan" } },
            { value: "suv", label: { ru: "Внедорожник", ua: "Позашляховик", en: "SUV" } },
            { value: "hatchback", label: { ru: "Хэтчбек", ua: "Хетчбек", en: "Hatchback" } },
            { value: "wagon", label: { ru: "Универсал", ua: "Універсал", en: "Wagon" } },
            { value: "coupe", label: { ru: "Купе", ua: "Купе", en: "Coupe" } },
            { value: "minivan", label: { ru: "Минивэн", ua: "Мінівен", en: "Minivan" } },
        ]
      },
      {
        key: "color",
        label: { ru: "Цвет", ua: "Колір", en: "Color" },
        type: "text",
      },
      {
        key: "customs_cleared",
        label: { ru: "Растаможен", ua: "Розмитнений", en: "Customs cleared" },
        type: "boolean",
      },
      {
        key: "broken",
        label: { ru: "Битый", ua: "Битий", en: "Broken" },
        type: "boolean",
      },
      {
        key: "service_history",
        label: { ru: "Сервисная история", ua: "Сервісна історія", en: "Service history" },
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
        label: { ru: "Тип детали", ua: "Тип деталі", en: "Part type" },
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
        key: "brand",
        label: { ru: "Марка авто", ua: "Марка авто", en: "Car brand" },
        type: "text",
      },
      {
        key: "model",
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
        label: { ru: "Оригинальность", ua: "Оригінальність", en: "Originality" },
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
          { value: "1plus", label: { ru: "1+", ua: "1+", en: "1+" } },
          { value: "3plus", label: { ru: "3+", ua: "3+", en: "3+" } },
          { value: "5plus", label: { ru: "5+", ua: "5+", en: "5+" } },
        ],
      },
      {
        key: "salary",
        label: { ru: "Зарплата", ua: "Зарплата", en: "Salary" },
        type: "range",
      },
      {
        key: "industry",
        label: { ru: "Сфера", ua: "Сфера", en: "Industry" },
        type: "select",
        options: [
            { value: "logistics", label: { ru: "Логистика", ua: "Логістика", en: "Logistics" } },
            { value: "it", label: { ru: "IT", ua: "IT", en: "IT" } },
            { value: "construction", label: { ru: "Строительство", ua: "Будівництво", en: "Construction" } },
            { value: "trade", label: { ru: "Торговля", ua: "Торгівля", en: "Trade" } },
            { value: "service", label: { ru: "Сфера услуг", ua: "Сфера послуг", en: "Service" } },
            { value: "other", label: { ru: "Другое", ua: "Інше", en: "Other" } },
        ]
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
        key: "product_type",
        label: { ru: "Категория", ua: "Категорія", en: "Category" },
        type: "select",
        options: [
            { value: "pet", label: { ru: "Домашние животные", ua: "Домашні тварини", en: "Pets" } },
            { value: "goods", label: { ru: "Товары для животных", ua: "Товари для тварин", en: "Pet goods" } },
        ]
      },
      // Животные
      {
        key: "subtype",
        label: { ru: "Вид", ua: "Вид", en: "Species" },
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
        type: "text",
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
      {
        key: "vaccinations",
        label: { ru: "Прививки", ua: "Щеплення", en: "Vaccinations" },
        type: "boolean",
      },
      {
        key: "documents",
        label: { ru: "Документы", ua: "Документи", en: "Documents" },
        type: "boolean",
      },
      {
        key: "sterilized",
        label: { ru: "Стерилизован", ua: "Стерилізований", en: "Sterilized" },
        type: "boolean",
      },
      // Товары
      {
        key: "goods_type",
        label: { ru: "Тип товара", ua: "Тип товару", en: "Goods type" },
        type: "select",
        options: [
            { value: "kennel", label: { ru: "Будки", ua: "Будки", en: "Kennels" } },
            { value: "cage", label: { ru: "Клетки", ua: "Клітки", en: "Cages" } },
            { value: "food", label: { ru: "Корм", ua: "Корм", en: "Food" } },
            { value: "carrier", label: { ru: "Переноски", ua: "Переноски", en: "Carriers" } },
            { value: "other", label: { ru: "Другое", ua: "Інше", en: "Other" } },
        ]
      },
      {
        key: "size",
        label: { ru: "Размер", ua: "Розмір", en: "Size" },
        type: "text",
      },
      {
        key: "condition",
        label: { ru: "Состояние", ua: "Стан", en: "Condition" },
        type: "select",
        options: [
            { value: "new", label: { ru: "Новое", ua: "Нове", en: "New" } },
            { value: "used", label: { ru: "Б/у", ua: "Б/в", en: "Used" } },
        ]
      }
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
      {
        key: "subtype",
        label: { ru: "Тип мебели", ua: "Тип меблів", en: "Furniture type" },
        type: "select",
        options: [
          { value: "table", label: { ru: "Стол", ua: "Стіл", en: "Table" } },
          { value: "cabinet", label: { ru: "Шкаф", ua: "Шафа", en: "Cabinet" } },
          { value: "sofa", label: { ru: "Диван", ua: "Диван", en: "Sofa" } },
          { value: "bed", label: { ru: "Кровать", ua: "Ліжко", en: "Bed" } },
          { value: "chair", label: { ru: "Стул", ua: "Стілець", en: "Chair" } },
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
      {
        key: "dimensions",
        label: { ru: "Размеры", ua: "Розміри", en: "Dimensions" },
        type: "text",
      },
      {
        key: "manufacturer",
        label: { ru: "Производитель", ua: "Виробник", en: "Manufacturer" },
        type: "text",
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
          { value: "tools", label: { ru: "Инструменты", ua: "Інструменти", en: "Tools" } },
          { value: "interior", label: { ru: "Интерьер", ua: "Інтер'єр", en: "Interior" } },
          { value: "appliances", label: { ru: "Техника", ua: "Техніка", en: "Appliances" } },
          { value: "garden", label: { ru: "Сад", ua: "Сад", en: "Garden" } },
          { value: "plants", label: { ru: "Растения", ua: "Рослини", en: "Plants" } },
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
      {
        key: "size",
        label: { ru: "Размер", ua: "Розмір", en: "Size" },
        type: "text",
      },
      {
        key: "manufacturer",
        label: { ru: "Производитель", ua: "Виробник", en: "Manufacturer" },
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
          // 1. Мобильные устройства и аксессуары
          { value: "phones_smartphones", label: { ru: "Сотовые телефоны и смартфоны", ua: "Стільникові телефони та смартфони", en: "Cell phones & smartphones" } },
          { value: "gadget_parts", label: { ru: "Запчасти и детали для гаджетов", ua: "Запчастини та деталі для гаджетів", en: "Gadget parts & components" } },
          { value: "phone_accessories", label: { ru: "Комплектующие для телефонов", ua: "Комплектуючі для телефонів", en: "Phone accessories" } },

          // 2. Компьютерная техника
          { value: "laptops_portables", label: { ru: "Ноутбуки и портативные ПК", ua: "Ноутбуки та портативні ПК", en: "Laptops & portable PCs" } },
          { value: "stationary_pcs", label: { ru: "Стационарные компьютеры (ПК)", ua: "Стаціонарні комп'ютери (ПК)", en: "Desktop computers (PCs)" } },
          { value: "tablets_computers", label: { ru: "Планшетные компьютеры", ua: "Планшетні комп'ютери", en: "Tablet computers" } },
          { value: "components", label: { ru: "Комплектующие и компоненты", ua: "Комплектуючі та компоненти", en: "Hardware & components" } },
          { value: "monitors_displays", label: { ru: "Мониторы и дисплеи", ua: "Монітори та дисплеї", en: "Monitors & displays" } },
          { value: "peripherals", label: { ru: "Периферия", ua: "Периферія", en: "Peripherals" } },
          { value: "network_equipment", label: { ru: "Сетевое оборудование", ua: "Мережеве обладнання", en: "Network equipment" } },
          { value: "data_storage", label: { ru: "Накопители данных", ua: "Накопичувачі даних", en: "Data storage" } },

          // 3. Видео и Аудио
          { value: "tvs_mediacenters", label: { ru: "Телевизоры и медиацентры", ua: "Телевізори та медіацентри", en: "TVs & media centers" } },
          { value: "projectors_screens", label: { ru: "Проекторы и экраны", ua: "Проектори та екрани", en: "Projectors & screens" } },
          { value: "acoustics_speakers", label: { ru: "Акустика и колонки", ua: "Акустика та колонки", en: "Acoustics & speakers" } },
          { value: "headphones_headsets", label: { ru: "Наушники и гарнитуры", ua: "Навушники та гарнітури", en: "Headphones & headsets" } },
          { value: "home_audio_equipment", label: { ru: "Музыкальное оборудование (Домашнее аудио)", ua: "Музичне обладнання (Домашнє аудіо)", en: "Home audio equipment" } },
          { value: "recording_devices", label: { ru: "Записывающие устройства", ua: "Записуючі пристрої", en: "Recording devices" } },

          // 4. Фототехника и Оптика
          { value: "cameras_lenses", label: { ru: "Камеры и объективы", ua: "Камери та об'єктиви", en: "Cameras & lenses" } },
          { value: "video_equipment", label: { ru: "Видеооборудование", ua: "Відеообладнання", en: "Video equipment" } },
          { value: "shooting_accessories", label: { ru: "Аксессуары для съемки", ua: "Аксесуари для зйомки", en: "Shooting accessories" } },
          { value: "digital_photo_frames", label: { ru: "Цифровые и бумажные фоторамки", ua: "Цифрові та паперові фоторамки", en: "Digital & paper photo frames" } },

          // 5. Игровая электроника
          { value: "gaming_consoles", label: { ru: "Консоли (Игровые приставки)", ua: "Консолі (Ігрові приставки)", en: "Gaming consoles" } },
          { value: "gaming_accessories", label: { ru: "Аксессуары для гейминга", ua: "Аксесуари для геймінгу", en: "Gaming accessories" } },
          { value: "games_software", label: { ru: "Игры и ПО для консолей", ua: "Ігри та ПЗ для консолей", en: "Games & software for consoles" } },

          // 6. Бытовая техника
          { value: "major_appliances", label: { ru: "Крупная бытовая техника", ua: "Велика побутова техніка", en: "Major appliances" } },
          { value: "kitchen_appliances", label: { ru: "Техника для кухни", ua: "Техніка для кухні", en: "Kitchen appliances" } },
          { value: "climate_heating", label: { ru: "Климат и отопление", ua: "Клімат та опалення", en: "Climate control & heating" } },
          { value: "vacuums_robotics", label: { ru: "Пылесосы и роботы-уборщики", ua: "Пилососи та роботи-прибиральники", en: "Vacuums & robotic cleaners" } },

          // 7. Смарт-гаджеты и навигация
          { value: "smartwatches_bracelets", label: { ru: "Умные часы и браслеты", ua: "Розумні годинники та браслети", en: "Smartwatches & bracelets" } },
          { value: "ebooks_readers", label: { ru: "Электронные книги и ридеры", ua: "Електронні книги та рідери", en: "Ebooks & readers" } },
          { value: "gps_navigators_recorders", label: { ru: "GPS-навигаторы и видеорегистраторы", ua: "GPS-навігатори та відеореєстратори", en: "GPS navigators & recorders" } },
          { value: "other_smart_electronics", label: { ru: "Прочая умная электроника", ua: "Інша розумна електроніка", en: "Other smart electronics" } },
        ],
      },
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
        key: "memory",
        label: { ru: "Память", ua: "Пам'ять", en: "Memory" },
        type: "select",
        options: [
          { value: "64", label: { ru: "64 ГБ", ua: "64 ГБ", en: "64 GB" } },
          { value: "128", label: { ru: "128 ГБ", ua: "128 ГБ", en: "128 GB" } },
          { value: "256", label: { ru: "256 ГБ", ua: "256 ГБ", en: "256 GB" } },
          { value: "512", label: { ru: "512 ГБ", ua: "512 ГБ", en: "512 GB" } },
          { value: "1tb", label: { ru: "1 ТБ", ua: "1 ТБ", en: "1 TB" } },
        ],
      },
      {
        key: "ram",
        label: { ru: "RAM", ua: "RAM", en: "RAM" },
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
        key: "warranty",
        label: { ru: "Гарантия", ua: "Гарантія", en: "Warranty" },
        type: "boolean",
      },
      {
        key: "kit",
        label: { ru: "Комплектация", ua: "Комплектація", en: "Kit" },
        type: "text",
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
        ]
      },
    ],
  },
];