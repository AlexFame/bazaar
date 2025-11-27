// lib/i18n.js
// Серверный модуль – без React, только данные и утилиты

export const SUPPORTED_LANGS = ["ru", "ua", "en"];

export const translations = {
  ru: {
    navbar_brand: "Bazaar",
    navbar_create: "Создать",
    navbar_myAds: "Личный кабинет",

    new_heading: "Создать объявление",

    // Тип объявления
    field_type: "Тип",
    field_type_sell: "Продать",
    field_type_buy: "Купить",
    field_type_free: "Отдать",
    field_type_services: "Услуги",
    field_type_exchange: "Обмен",
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

    // --- NEW KEYS FROM FEED & DETAILS ---
    searchPlaceholder: "Поиск по тексту",
    locationPlaceholder: "Город / район",
    priceFrom: "Цена от",
    priceTo: "Цена до",
    allCategories: "Все категории",
    typeAny: "Любой тип",
    typeBuy: "Купить",
    typeSell: "Продать",
    typeServices: "Услуги",
    typeFree: "Отдам бесплатно",
    dateAll: "За всё время",
    dateToday: "Сегодня",
    date3d: "За 3 дня",
    date7d: "За неделю",
    date30d: "За месяц",
    popularQueriesLabel: "Популярные запросы:",
    loading: "Загружаем объявления...",
    empty: "По этим фильтрам объявлений нет.",
    loadMore: "Показать ещё",
    loadingMore: "Загружаю...",
    conditionAny: "Любое состояние",
    conditionNew: "Новое",
    conditionUsed: "Б/у",
    conditionLikeNew: "Как новое",
    barter: "Бартер",
    withPhoto: "С фото",
    yes: "Да",
    no: "Нет",
    filters: "Фильтры",
    category: "Категория",
    price: "Цена",
    condition: "Состояние",
    type: "Тип",
    more: "Ещё",
    foundInCategory: "Найдено в категории:",
    
    popularListings: "Популярные объявления",
    
    msg_telegram: "Написать в Telegram",
    msg_call: "Позвонить",
    share: "Поделиться",
    edit: "Редактировать",
    delete: "Удалить",
    write_msg: "Написать",
    view_profile: "Смотреть профиль",
    similar_ads: "Похожие объявления",
    confirm_delete: "Вы уверены, что хотите удалить это объявление?",
    delete_error: "Не удалось удалить объявление",
    delete_success: "Объявление удалено",
    share_copied: "Ссылка скопирована!",

    // Reviews
    reviews_tab: "Отзывы",
    listings_tab: "Объявления",
    no_active_listings: "У пользователя нет активных объявлений",
    leave_review: "Оставить отзыв",
    rating: "Оценка",
    comment_label: "Комментарий (необязательно)",
    comment_ph: "Расскажите о вашем опыте...",
    send_review: "Отправить отзыв",
    sending: "Отправка...",
    review_success: "Отзыв успешно добавлен!",
    review_error: "Ошибка при добавлении отзыва.",
    login_review: "Пожалуйста, войдите через Telegram, чтобы оставить отзыв.",
    self_review: "Вы не можете оставить отзыв самому себе.",
    profile_not_found: "Профиль не найден. Пожалуйста, создайте профиль.",
  },

  ua: {
    navbar_brand: "Bazaar",
    navbar_create: "Створити",
    navbar_myAds: "Особистий кабінет",

    new_heading: "Створити оголошення",

    field_type: "Тип",
    field_type_sell: "Продати",
    field_type_buy: "Купити",
    field_type_free: "Віддати безкоштовно",
    field_type_services: "Послуги",
    field_type_exchange: "Обмін",
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

    // --- NEW KEYS FROM FEED & DETAILS ---
    searchPlaceholder: "Пошук по тексту",
    locationPlaceholder: "Місто / район",
    priceFrom: "Ціна від",
    priceTo: "Ціна до",
    allCategories: "Усі категорії",
    typeAny: "Будь-який тип",
    typeBuy: "Купити",
    typeSell: "Продати",
    typeServices: "Послуги",
    typeFree: "Віддам безкоштовно",
    dateAll: "За весь час",
    dateToday: "Сьогодні",
    date3d: "За 3 дні",
    date7d: "За тиждень",
    date30d: "За місяць",
    popularQueriesLabel: "Популярні запити:",
    loading: "Завантажуємо оголошення...",
    empty: "За цими фільтрами оголошень немає.",
    loadMore: "Показати ще",
    loadingMore: "Завантажую...",
    conditionAny: "Будь-який стан",
    conditionNew: "Нове",
    conditionUsed: "Б/в",
    conditionLikeNew: "Як нове",
    barter: "Бартер",
    withPhoto: "З фото",
    yes: "Так",
    no: "Ні",
    filters: "Фільтри",
    category: "Категорія",
    price: "Ціна",
    condition: "Стан",
    type: "Тип",
    more: "Ще",
    foundInCategory: "Знайдено в категорії:",
    
    popularListings: "Популярні оголошення",
    
    msg_telegram: "Написати в Telegram",
    msg_call: "Подзвонити",
    share: "Поділитися",
    edit: "Редагувати",
    delete: "Видалити",
    write_msg: "Написати",
    view_profile: "Дивитися профіль",
    similar_ads: "Схожі оголошення",
    confirm_delete: "Ви впевнені, що хочете видалити це оголошення?",
    delete_error: "Не вдалося видалити оголошення",
    delete_success: "Оголошення видалено",
    share_copied: "Посилання скопійовано!",

    // Reviews
    reviews_tab: "Відгуки",
    listings_tab: "Оголошення",
    no_active_listings: "У користувача немає активних оголошень",
    leave_review: "Залишити відгук",
    rating: "Оцінка",
    comment_label: "Коментар (необов'язково)",
    comment_ph: "Розкажіть про ваш досвід...",
    send_review: "Надіслати відгук",
    sending: "Відправка...",
    review_success: "Відгук успішно додано!",
    review_error: "Помилка при додаванні відгуку.",
    login_review: "Будь ласка, увійдіть через Telegram, щоб залишити відгук.",
    self_review: "Ви не можете залишити відгук самому собі.",
    profile_not_found: "Профіль не знайдено. Будь ласка, створіть профіль.",
  },

  en: {
    navbar_brand: "Bazaar",
    navbar_create: "Create",
    navbar_myAds: "Profile",

    new_heading: "Create a listing",

    field_type: "Type",
    field_type_sell: "Sell",
    field_type_buy: "Buy",
    field_type_free: "Give away",
    field_type_services: "Services",
    field_type_exchange: "Exchange",
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

    // --- NEW KEYS FROM FEED & DETAILS ---
    searchPlaceholder: "Search text",
    locationPlaceholder: "City / district",
    priceFrom: "Price from",
    priceTo: "Price to",
    allCategories: "All categories",
    typeAny: "Any type",
    typeBuy: "Buy",
    typeSell: "Sell",
    typeServices: "Services",
    typeFree: "Give away",
    dateAll: "All time",
    dateToday: "Today",
    date3d: "Last 3 days",
    date7d: "Last week",
    date30d: "Last month",
    popularQueriesLabel: "Popular searches:",
    loading: "Loading listings...",
    empty: "No listings for these filters.",
    loadMore: "Show more",
    loadingMore: "Loading...",
    conditionAny: "Any condition",
    conditionNew: "New",
    conditionUsed: "Used",
    conditionLikeNew: "Like new",
    barter: "Barter",
    withPhoto: "With photo",
    yes: "Yes",
    no: "No",
    filters: "Filters",
    category: "Category",
    price: "Price",
    condition: "Condition",
    type: "Type",
    more: "More",
    foundInCategory: "Found in category:",
    
    popularListings: "Popular listings",
    
    msg_telegram: "Message on Telegram",
    msg_call: "Call",
    share: "Share",
    edit: "Edit",
    delete: "Delete",
    write_msg: "Write message",
    view_profile: "View profile",
    similar_ads: "Similar listings",
    confirm_delete: "Are you sure you want to delete this listing?",
    delete_error: "Failed to delete listing",
    delete_success: "Listing deleted",
    share_copied: "Link copied!",
    
    // Reviews
    reviews_tab: "Reviews",
    listings_tab: "Listings",
    no_active_listings: "User has no active listings",
    leave_review: "Leave a review",
    rating: "Rating",
    comment_label: "Comment (optional)",
    comment_ph: "Tell about your experience...",
    send_review: "Submit review",
    sending: "Sending...",
    review_success: "Review added!",
    review_error: "Error adding review",
    login_review: "Please login via Telegram to leave a review.",
    self_review: "You cannot review yourself.",
    profile_not_found: "Profile not found.",
  },
};
