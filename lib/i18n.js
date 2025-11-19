// lib/i18n.js
// Серверный модуль – без React, только данные и утилиты

export const SUPPORTED_LANGS = ["ru", "ua", "en"];

export const translations = {
  ru: {
    navbar_brand: "Bazaar",
    navbar_create: "Создать",
    navbar_myAds: "Мои объявления",

    new_heading: "Создать объявление",

    // Тип объявления
    field_type: "Тип",
    field_type_sell: "Продать",
    field_type_buy: "Купить",
    field_type_free: "Отдать бесплатно",
    field_type_services: "Услуги",
    field_category: "Категория",

    field_title: "Заголовок",
    field_title_ph: "iPhone, ноутбук, диван...",

    field_price: "Цена (€)",

    field_description: "Описание",
    field_description_ph: "Стан, характеристики, детали...",

    field_location: "Локация",
    field_location_ph: "Берлин, Кройцберг",

    field_contacts: "Контакты",
    field_contacts_ph: "Напишите, как с вами связаться (TG, WhatsApp...)",

    field_photos: "Фото",
    field_photos_ph: "Перетащите фото сюда или нажмите для выбора",

    btn_publish: "Опубликовать",
    btn_search: "Найти",

    // placeholder для верхнего поиска
    search_main_ph: "Поиск по объявлениям",

    feed_heading: "Лента объявлений",
    feed_empty: "Пока нет ни одного объявления.",

    // ----- АЛИАСЫ ДЛЯ НОВОЙ ФОРМЫ -----
    field_type_label: "Тип",
    field_category_label: "Категория",

    field_title_label: "Заголовок",
    // placeholder для заголовка уже есть: field_title_ph

    field_desc_label: "Описание",
    field_desc_ph: "Стан, характеристики, детали...",

    field_price_label: "Цена (€)",
    field_price_ph: "Укажите цену в евро",

    field_location_label: "Локация",
    field_location_ph2: "Берлин, Кройцберг", // запасной алиас, если где-то другой ключ
    field_location_ph2_short: "Город, район",

    field_contacts_label: "Контакты",
    field_contacts_ph2: "Телефон, Telegram или другой способ связи",
  },

  ua: {
    navbar_brand: "Bazaar",
    navbar_create: "Створити",
    navbar_myAds: "Мої оголошення",

    new_heading: "Створити оголошення",

    field_type: "Тип",
    field_type_sell: "Продати",
    field_type_buy: "Купити",
    field_type_free: "Віддати безкоштовно",
    field_type_services: "Послуги",
    field_category: "Категорія",

    field_title: "Заголовок",
    field_title_ph: "iPhone, ноутбук, диван...",

    field_price: "Ціна (€)",

    field_description: "Опис",
    field_description_ph: "Стан, характеристики, деталі...",

    field_location: "Локація",
    field_location_ph: "Берлін, Кройцберг",

    field_contacts: "Контакти",
    field_contacts_ph: "Напишіть, як з вами звʼязатися (TG, WhatsApp...)",

    field_photos: "Фото",
    field_photos_ph: "Перетягни фото сюди або натисни для вибору",

    btn_publish: "Опублікувати",
    btn_search: "Знайти",

    // placeholder для верхнього пошуку
    search_main_ph: "Пошук по оголошеннях",

    feed_heading: "Стрічка оголошень",
    feed_empty: "Поки немає жодного оголошення.",

    // ----- АЛИАСЫ ДЛЯ НОВОЙ ФОРМЫ -----
    field_type_label: "Тип",
    field_category_label: "Категорія",

    field_title_label: "Заголовок",
    // плейсхолдер уже есть: field_title_ph

    field_desc_label: "Опис",
    field_desc_ph: "Додайте деталі: стан, особливості тощо.",

    field_price_label: "Ціна (€)",
    field_price_ph: "Вкажіть ціну в євро",

    field_location_label: "Локація",
    field_location_ph2: "Берлін, Кройцберг",
    field_location_ph2_short: "Місто, район",

    field_contacts_label: "Контакти",
    field_contacts_ph2: "Телефон, Telegram або інший спосіб звʼязку",
  },

  en: {
    navbar_brand: "Bazaar",
    navbar_create: "Create",
    navbar_myAds: "My ads",

    new_heading: "Create a listing",

    field_type: "Type",
    field_type_sell: "Sell",
    field_type_buy: "Buy",
    field_type_free: "Give away",
    field_type_services: "Services",
    field_category: "Category",

    field_title: "Title",
    field_title_ph: "iPhone, laptop, couch...",

    field_price: "Price (€)",

    field_description: "Description",
    field_description_ph: "Condition, specs, details...",

    field_location: "Location",
    field_location_ph: "Berlin, Kreuzberg",

    field_contacts: "Contacts",
    field_contacts_ph: "How to contact you (TG, WhatsApp...)",

    field_photos: "Photos",
    field_photos_ph: "Drag an image here or tap to select",

    btn_publish: "Publish",
    btn_search: "Search",

    // placeholder for top search
    search_main_ph: "Search listings",

    feed_heading: "Listings feed",
    feed_empty: "No listings yet.",

    // ----- ALIASES FOR NEW FORM KEYS -----
    field_type_label: "Type",
    field_category_label: "Category",

    field_title_label: "Title",

    field_desc_label: "Description",
    field_desc_ph: "Add details: condition, features, etc.",

    field_price_label: "Price (€)",
    field_price_ph: "Enter the price in euro",

    field_location_label: "Location",
    field_location_ph2: "Berlin, Kreuzberg",
    field_location_ph2_short: "City, district",

    field_contacts_label: "Contacts",
    field_contacts_ph2: "Phone, Telegram or other contact method",
  },
};
