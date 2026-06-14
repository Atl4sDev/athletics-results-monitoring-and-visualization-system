const uk = {
  // Status
  UPCOMING: 'Заплановано',
  ONGOING: 'Триває',
  COMPLETED: 'Завершено',
  UNCONFIRMED: 'Попередній',
  SCHEDULED: 'Заплановано',
  OFFICIAL: 'Офіційний',

  // Environment
  INDOOR: 'Манеж',
  OUTDOOR: 'Стадіон',

  // General UI
  PRELIMINARY: 'попередні',
  LOAD_MORE: 'Завантажити ще',
  LOADING: 'Завантаження',
  EMPTY_RESULTS: 'Немає результатів',

  // Navigation
  NAV_CALENDAR: 'Календар',
  NAV_RANKINGS: 'Рейтинги',
  NAV_SEARCH: 'Пошук',
  BRAND: 'Легка атлетика',
  ADMIN_PANEL: 'Адмін-панель',

  // Auth
  LOGIN: 'Вхід',
  EMAIL: 'Email',
  PASSWORD: 'Пароль',
  SIGN_IN: 'Увійти',
  LOGOUT: 'Вийти',

  // Errors
  ERROR_GENERIC: 'Щось пішло не так',
  ERROR_NOT_FOUND: 'Не знайдено',
  ERROR_RETRY: 'Спробуйте ще раз',
  ERROR_UNAUTHORIZED: 'Потрібна авторизація',

  // Competition detail
  UNSCHEDULED: 'Без дати',
  NO_EVENTS: 'Заходів немає',
  NO_HEATS: 'Забігів немає',

  // Athlete profile
  PB: 'PB',
  SB: 'SB',
  NO_RESULTS: 'Результатів немає',
  SELECT_DISCIPLINE: 'Оберіть дисципліну',
  NO_OUTDOOR_RECORDS: 'Немає результатів на стадіоні',
  NO_INDOOR_RECORDS: 'Немає результатів у манежі',
  NO_PROGRESSION: 'Немає даних для побудови графіку',
  ATHLETE_NOT_FOUND: 'Спортсмена не знайдено',
  PROGRESSION_SINGLE_POINT: 'Єдиний результат',
  PERSONAL_BEST: 'Особистий рекорд',
  SEASON_BEST: 'Рекорд сезону',
  COL_DATE: 'Дата',
  COL_COMPETITION: 'Змагання',
  COL_DISCIPLINE: 'Дисципліна',

  // Rankings
  RANK: 'М',
  ATHLETE: 'Спортсмен',
  MARK: 'Результат',
  TEAM: 'Клуб',
  DISCIPLINE_REQUIRED: 'Оберіть дисципліну для перегляду рейтингу',
  SEASON_CURRENT: 'Поточний сезон',
  FILTER_DISCIPLINE: 'Дисципліна',
  FILTER_GENDER: 'Стать',
  FILTER_AGE_CATEGORY: 'Вікова категорія',
  FILTER_SEASON: 'Сезон',

  // Heat table columns
  COL_PLACE: 'М',
  COL_LANE: 'Д',
  COL_BIB: '№',
  COL_REAC: 'Р/ч',

  // Heat labels
  HEAT_LABEL: 'Забіг',

  // Wind
  WIND: 'Вітер',
  WIND_UNIT: 'м/с',

  // Calendar filters
  FILTER_STATUS: 'Статус',
  FILTER_ENVIRONMENT: 'Середовище',
  FILTER_YEAR: 'Рік',
  FILTER_ALL: 'Всі',

  // Search
  SEARCH_PLACEHOLDER: 'Пошук спортсменів…',
  NO_SEARCH_RESULTS: 'Нічого не знайдено',

  // Admin navigation
  NAV_ADMIN_MODERATION: 'Модерація',
  NAV_ADMIN_COMPETITIONS: 'Змагання',
  NAV_ADMIN_DISCIPLINES: 'Дисципліни',
  NAV_ADMIN_ATHLETES: 'Спортсмени',

  // Admin CRUD — general actions
  CONFIRM: 'Підтвердити',
  CANCEL: 'Скасувати',
  DELETE: 'Видалити',
  EDIT: 'Редагувати',
  CREATE: '+ Створити',
  SAVE: 'Зберегти',
  MERGE: "Об'єднати",
  COPY: 'Копіювати',
  COPIED: 'Скопійовано',
  ROTATE_TOKEN: 'Перевипустити токен',
  COPY_TOKEN: 'Скопіювати токен',
  TOKEN_COPIED: 'Токен скопійовано',

  // Admin competitions
  COMP_NAME: 'Назва',
  COMP_DATES: 'Дати',
  COMP_DATE_START: 'Дата початку',
  COMP_DATE_END: 'Дата закінчення',
  COMP_LOCATION: 'Місце проведення',
  COMP_ENVIRONMENT: 'Тип',
  COMP_STATUS: 'Статус',
  COMP_DOCUMENTS: 'Документи',
  COMP_SYNC_TOKEN: 'Токен Синхронізації',
  COMP_DELETE_TITLE: 'Видалити змагання?',
  COMP_DELETE_BODY: 'Дія незворотна. Усі пов\'язані дані будуть видалені.',
  COMP_ROTATE_TOKEN_TITLE: 'Перевипустити токен?',
  COMP_ROTATE_TOKEN_BODY: 'Попередній токен стане недійсним. Усі інтеграції, що його використовують, перестануть працювати.',

  // Admin disciplines
  DISC_CODE: 'Код',
  DISC_NAME: 'Назва',
  DISC_TYPE: 'Тип',
  DISC_IS_STANDARD: 'Стандартна',
  DISC_TYPE_TRACK: 'Бігові',
  DISC_TYPE_FIELD: 'Технічні',
  DISC_CREATE_TITLE: 'Нова дисципліна',
  DISC_EDIT_TITLE: 'Редагувати дисципліну',
  DISC_DELETE_TITLE: 'Видалити дисципліну?',
  DISC_DELETE_BODY: 'Дія незворотна.',
  DISC_FILTER_TYPE: 'Тип дисципліни',
  DISC_FILTER_STANDARD: 'Лише стандартні',

  // Admin athletes
  ATHLETE_LICENSE: 'Номер ліцензії',
  ATHLETE_FIRST_NAME: 'Ім\'я',
  ATHLETE_LAST_NAME: 'Прізвище',
  ATHLETE_GENDER: 'Стать',
  ATHLETE_BIRTH_DATE: 'Дата народження',
  ATHLETE_BIRTH_YEAR: 'Рік народження',
  ATHLETE_CREATE_TITLE: 'Новий спортсмен',
  ATHLETE_EDIT_TITLE: 'Редагувати спортсмена',
  ATHLETE_DELETE_TITLE: 'Видалити спортсмена?',
  ATHLETE_DELETE_BODY: 'Дія незворотна.',
  ATHLETE_MERGE_TITLE: "Об'єднати спортсменів",
  ATHLETE_MERGE_SOURCE: 'Джерело (буде видалено)',
  ATHLETE_MERGE_TARGET: 'Ціль (залишиться)',
  ATHLETE_MERGE_DIRECTION: 'Джерело буде об\'єднано в ціль і видалено. Дія незворотна.',
  ATHLETE_MERGE_CONFIRM_TITLE: 'Підтвердити об\'єднання?',
  ATHLETE_MERGE_CONFIRM_BODY: 'Спортсмен-джерело буде видалено. Дія незворотна.',
  ATHLETE_RESULTS_COUNT: 'результатів',
  ATHLETE_SEARCH_PLACEHOLDER: 'Пошук за ім\'ям або ліцензією…',
  ATHLETE_SEARCH_LABEL: 'Пошук спортсмена',

  // Empty states
  EMPTY_COMPETITIONS: 'Змагань не знайдено',
  EMPTY_DISCIPLINES: 'Дисципліни не знайдено',
  EMPTY_ATHLETES: 'Спортсменів не знайдено. Введіть запит для пошуку.',

  // Auth errors
  ERROR_RATE_LIMIT: 'Забагато спроб. Зачекайте 15 хвилин.',

  // Gender (plural — used for categories/filters)
  MALE: 'Чоловіки',
  FEMALE: 'Жінки',
  MIXED: 'Змішані',

  // Gender (singular — used for individual athlete profile)
  GENDER_MALE: 'Чоловік',
  GENDER_FEMALE: 'Жінка',

  // Moderation
  MODERATION_TITLE: 'Черга модерації',
  MODERATION_EMPTY: 'Немає забігів, що очікують підтвердження.',
  MODERATION_CONFIRM_TITLE: 'Підтвердити забіг?',
  MODERATION_CONFIRM_BODY: 'Дія незворотна — результати стануть публічними та будуть перераховані особисті рекорди.',
  MODERATION_SELECT_HEAT: 'Оберіть забіг зі списку для перегляду.',
  MODERATION_RESULTS_COUNT: 'учасників',
  MODERATION_UNCONFIRM: 'Скасувати підтвердження',
  MODERATION_UNCONFIRM_TITLE: 'Скасувати підтвердження?',
  MODERATION_UNCONFIRM_BODY: 'Забіг повернеться до статусу «Попередній».',
  MODERATION_FILTER_COMPETITION: 'Змагання',
  MODERATION_ALL_COMPETITIONS: 'Усі змагання',
  MODERATION_STATUS_FILTER: 'Показати підтверджені',
  ADD_RESULT: 'Додати спортсмена',
  EDIT_RESULT: 'Редагувати',
  DELETE_RESULT: 'Видалити рядок',
  RESULT_DELETED: 'Рядок видалено',
  RESULT_SAVED: 'Збережено',
  MODERATION_STALE: 'Список застарів — оновіть сторінку',
  BACK: '← Назад',
  CONFIRM_HEAT: 'Підтвердити забіг',
  YES: 'Так',
  NO: 'Ні',
  DELETE_CONFIRM_INLINE: 'Видалити рядок?',
  RETRY: 'Спробуйте ще раз',
} as const

export default uk
