import type { Chat, Post, Settings, Story, User } from '../types';

const now = Date.now();
const min = 60_000;
const hour = 60 * min;
const day = 24 * hour;

const avatar = (n: number) => `https://i.pravatar.cc/200?img=${n}`;
const photo = (seed: string, w = 720, h = 960) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
const video = (name: string) =>
  `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/${name}.mp4`;

export const ME_ID = 'me';

export const initialMe: User = {
  id: ME_ID,
  name: 'Александр Орлов',
  username: 'alex.orlov',
  avatar: avatar(12),
  phone: '+7 916 123-45-67',
  bio: 'Москва · люблю горы и кофе ☕️',
  online: true,
};

/** Контакты из телефонной книги */
export const initialContacts: User[] = [
  { id: 'u1', name: 'Алина Смирнова', username: 'alina.sm', avatar: avatar(47), phone: '+7 903 555-12-01', bio: 'Фотограф · СПб', online: true },
  { id: 'u2', name: 'Дмитрий Козлов', username: 'dkozlov', avatar: avatar(53), phone: '+7 925 111-22-33', bio: 'Frontend в Яндексе', lastSeen: now - 15 * min },
  { id: 'u3', name: 'Маша Иванова', username: 'masha_iv', avatar: avatar(45), phone: '+7 916 777-88-99', bio: 'Танцы, путешествия, котики', online: true },
  { id: 'u4', name: 'Артём Волков', username: 'artem.volkov', avatar: avatar(59), phone: '+7 999 404-40-40', bio: 'Сноуборд 🏂', lastSeen: now - 3 * hour },
  { id: 'u5', name: 'Катя Морозова', username: 'katya.moroz', avatar: avatar(44), phone: '+7 905 321-00-11', bio: 'Дизайнер интерфейсов', lastSeen: now - 1 * day },
  { id: 'u6', name: 'Никита Соколов', username: 'nik.sokol', avatar: avatar(60), phone: '+7 926 909-09-09', online: true },
  { id: 'u7', name: 'Соня Лебедева', username: 'sonya.leb', avatar: avatar(32), phone: '+7 977 123-12-12', bio: 'Казань ❤️', lastSeen: now - 40 * min },
  { id: 'u8', name: 'Егор Новиков', username: 'egor_n', avatar: avatar(68), phone: '+7 915 654-32-10', lastSeen: now - 5 * day },
  { id: 'u9', name: 'Полина Фёдорова', username: 'polina.f', avatar: avatar(9), phone: '+7 985 246-80-24', bio: 'Йога и смузи', lastSeen: now - 2 * hour },
  { id: 'u10', name: 'Мама', username: 'mama', avatar: avatar(49), phone: '+7 916 000-00-01', lastSeen: now - 20 * min },
];

/** Авторы рекомендаций — не в контактах */
export const initialCreators: User[] = [
  { id: 'c1', name: 'Путешествия по России', username: 'travel.russia', avatar: photo('trv-av', 200, 200), verified: true, followers: 1_240_000, bio: 'Самые красивые места страны' },
  { id: 'c2', name: 'Шеф Миша', username: 'chef_misha', avatar: avatar(14), verified: true, followers: 856_000, bio: 'Готовлю просто и вкусно' },
  { id: 'c3', name: 'Москва Вайб', username: 'moscow_vibes', avatar: photo('msk-av', 200, 200), followers: 312_000, bio: 'Город, который не спит' },
  { id: 'c4', name: 'Оля Фитнес', username: 'fitness.olya', avatar: avatar(25), followers: 470_000, bio: 'Тренировки дома 💪' },
  { id: 'c5', name: 'Авто Обзор', username: 'auto_review', avatar: avatar(33), verified: true, followers: 2_100_000, bio: 'Честные обзоры машин' },
  { id: 'c6', name: 'Котики Daily', username: 'kotiki.daily', avatar: photo('cat-av', 200, 200), followers: 3_400_000, bio: 'Каждый день по котику' },
  { id: 'c7', name: 'Технологии', username: 'tech.ru', avatar: photo('tech-av', 200, 200), verified: true, followers: 640_000, bio: 'Новости IT' },
];

const comments = (pairs: [string, string, number][]) =>
  pairs.map(([authorId, text, ago], i) => ({
    id: `cm-${authorId}-${i}-${ago}`,
    authorId,
    text,
    createdAt: now - ago,
    likes: Math.floor(Math.random() * 300),
  }));

export const initialPosts: Post[] = [
  {
    id: 'p1', authorId: 'c1', type: 'video', media: [video('ForBiggerEscapes')], poster: photo('p1'),
    caption: 'Байкал зимой — это другая планета 🧊 #байкал #путешествия #россия', music: 'Баста — Выпускной', location: 'Байкал',
    likes: 128_400, shares: 3_200, views: 1_900_000, createdAt: now - 5 * hour,
    comments: comments([['u1', 'Мечтаю туда поехать!', 2 * hour], ['u3', 'Как же красиво 😍', 3 * hour], ['c3', 'Огонь 🔥', 4 * hour]]),
  },
  {
    id: 'p2', authorId: 'u1', type: 'photo', media: [photo('alina1'), photo('alina2'), photo('alina3')],
    caption: 'Белые ночи в Питере никогда не надоедают 🌉', location: 'Санкт-Петербург',
    likes: 214, shares: 3, views: 900, createdAt: now - 2 * hour,
    comments: comments([['u3', 'Вау, кадры огонь!', 40 * min], ['u2', 'Где это?', 70 * min]]),
  },
  {
    id: 'p3', authorId: 'c2', type: 'video', media: [video('ForBiggerJoyrides')], poster: photo('p3'),
    caption: 'Сырники за 10 минут — рецепт в комментариях 🥞 #рецепт #завтрак', music: 'Оригинальный звук — Шеф Миша',
    likes: 54_300, shares: 12_000, views: 640_000, createdAt: now - 9 * hour,
    comments: comments([['u9', 'Попробую завтра!', 1 * hour], ['u10', 'А сметану какую брать?', 2 * hour]]),
  },
  {
    id: 'p4', authorId: 'c6', type: 'video', media: [video('ForBiggerFun')], poster: photo('p4'),
    caption: 'Когда сказал коту, что корм закончился 😹 #котики', music: 'Мияги — Minor',
    likes: 412_000, shares: 41_000, views: 5_300_000, createdAt: now - 1 * day,
    comments: comments([['u6', 'ахахах мой такой же', 5 * hour]]),
  },
  {
    id: 'p5', authorId: 'u3', type: 'photo', media: [photo('masha1'), photo('masha2')],
    caption: 'Выходные в Сочи ☀️🌊', location: 'Сочи',
    likes: 98, shares: 1, views: 340, createdAt: now - 4 * hour,
    comments: comments([['u1', 'Красотка!', 2 * hour]]),
  },
  {
    id: 'p6', authorId: 'c5', type: 'video', media: [video('ForBiggerMeltdowns')], poster: photo('p6'),
    caption: 'Стоит ли брать в 2026? Полный обзор 🚗 #авто #обзор', music: 'Оригинальный звук — Авто Обзор',
    likes: 87_900, shares: 5_600, views: 1_100_000, createdAt: now - 2 * day,
    comments: comments([['u4', 'Брал такую, не пожалел', 1 * day]]),
  },
  {
    id: 'p7', authorId: 'u4', type: 'photo', media: [photo('artem1'), photo('artem2'), photo('artem3'), photo('artem4')],
    caption: 'Шерегеш, первый снег 🏂', location: 'Шерегеш',
    likes: 156, shares: 4, views: 610, createdAt: now - 7 * hour, comments: [],
  },
  {
    id: 'p8', authorId: 'c4', type: 'video', media: [video('ForBiggerBlazes')], poster: photo('p8'),
    caption: 'Тренировка на 15 минут без инвентаря 💪 #фитнес #дома', music: 'Zivert — Life',
    likes: 33_100, shares: 8_900, views: 410_000, createdAt: now - 12 * hour,
    comments: comments([['u9', 'Сохранила!', 3 * hour]]),
  },
  {
    id: 'p9', authorId: 'u7', type: 'photo', media: [photo('sonya1')],
    caption: 'Кремль Казани вечером ✨', location: 'Казань',
    likes: 72, shares: 0, views: 220, createdAt: now - 1 * day, comments: [],
  },
  {
    id: 'p10', authorId: 'c3', type: 'video', media: [video('WeAreGoingOnBullrun')], poster: photo('p10'),
    caption: 'Ночная Москва с высоты 🌃 #москва', music: 'Тима Белорусских — Мокрые кроссы',
    likes: 64_000, shares: 2_100, views: 780_000, createdAt: now - 3 * day,
    comments: comments([['u2', 'Где снимали?', 1 * day]]),
  },
  {
    id: 'p11', authorId: 'u1', type: 'video', media: [video('SubaruOutbackOnStreetAndDirt')], poster: photo('p11'),
    caption: 'Поездка на Алтай 🏔 #алтай', music: 'Оригинальный звук — alina.sm', location: 'Алтай',
    likes: 341, shares: 12, views: 2_300, createdAt: now - 2 * day, comments: [],
  },
  {
    id: 'p12', authorId: 'c7', type: 'video', media: [video('VolkswagenGTIReview')], poster: photo('p12'),
    caption: 'Новый смартфон за 3 минуты 📱 #технологии', music: 'Оригинальный звук — tech.ru',
    likes: 21_700, shares: 900, views: 230_000, createdAt: now - 6 * hour, comments: [],
  },
  {
    id: 'p13', authorId: ME_ID, type: 'photo', media: [photo('me1')],
    caption: 'Эльбрус покорён 🏔', location: 'Эльбрус',
    likes: 187, shares: 2, views: 800, createdAt: now - 10 * day,
    comments: comments([['u2', 'Красавчик!', 9 * day]]),
  },
  {
    id: 'p14', authorId: ME_ID, type: 'photo', media: [photo('me2'), photo('me3')],
    caption: 'Утренний кофе ☕️',
    likes: 64, shares: 0, views: 300, createdAt: now - 20 * day, comments: [],
  },
];

export const initialStories: Story[] = [
  { authorId: 'u1', items: [
    { id: 's1', type: 'image', url: photo('st1', 720, 1280), createdAt: now - 1 * hour },
    { id: 's2', type: 'image', url: photo('st2', 720, 1280), createdAt: now - 50 * min },
  ] },
  { authorId: 'u3', items: [{ id: 's3', type: 'image', url: photo('st3', 720, 1280), createdAt: now - 3 * hour }] },
  { authorId: 'u2', items: [
    { id: 's4', type: 'image', url: photo('st4', 720, 1280), createdAt: now - 6 * hour },
    { id: 's5', type: 'video', url: video('ForBiggerFun'), createdAt: now - 5 * hour },
  ] },
  { authorId: 'u6', items: [{ id: 's6', type: 'image', url: photo('st6', 720, 1280), createdAt: now - 8 * hour }] },
  { authorId: 'u7', items: [{ id: 's7', type: 'image', url: photo('st7', 720, 1280), createdAt: now - 10 * hour }] },
  { authorId: 'u9', items: [
    { id: 's8', type: 'image', url: photo('st8', 720, 1280), createdAt: now - 12 * hour },
    { id: 's9', type: 'image', url: photo('st9', 720, 1280), createdAt: now - 11 * hour },
  ] },
  { authorId: 'u4', items: [{ id: 's10', type: 'image', url: photo('st10', 720, 1280), createdAt: now - 20 * hour }] },
];

let seq = 0;
const msg = (authorId: string, text: string, ago: number, extra: Partial<Chat['messages'][number]> = {}) => ({
  id: `m${++seq}`,
  authorId,
  text,
  createdAt: now - ago,
  status: 'read' as const,
  ...extra,
});

export const initialChats: Chat[] = [
  {
    id: 'ch-u1', type: 'private', peerId: 'u1', memberIds: [ME_ID, 'u1'], pinned: true, unread: 2,
    messages: [
      msg('u1', 'Привет! Как ты?', 1 * day + 3 * hour),
      msg(ME_ID, 'Привет) Всё отлично, вчера вернулся из поездки', 1 * day + 2 * hour),
      msg('u1', 'О, круто! Покажешь фотки?', 1 * day + 2 * hour - 5 * min),
      msg(ME_ID, 'Конечно, скину вечером', 1 * day + 1 * hour),
      msg('u1', 'Видел мои истории из Питера?', 20 * min),
      msg('u1', 'Пойдём в субботу в кино? 🎬', 18 * min),
    ],
  },
  {
    id: 'ch-g1', type: 'group', title: 'Друзья 🍻', avatar: photo('grp1', 200, 200), memberIds: [ME_ID, 'u2', 'u4', 'u6'], pinned: true, unread: 5,
    messages: [
      msg('u2', 'Кто в пятницу в бар?', 5 * hour),
      msg('u4', 'Я за!', 4 * hour + 50 * min),
      msg(ME_ID, 'Я тоже, во сколько?', 4 * hour + 40 * min),
      msg('u6', 'Давайте в 20:00', 3 * hour),
      msg('u2', 'Ок, бронирую столик', 2 * hour),
      msg('u4', 'Возьму с собой Егора', 1 * hour),
      msg('u6', '👍', 50 * min),
      msg('u2', 'Забронировал на 6 человек', 30 * min),
    ],
  },
  {
    id: 'ch-u10', type: 'private', peerId: 'u10', memberIds: [ME_ID, 'u10'], unread: 1,
    messages: [
      msg('u10', 'Сынок, ты покушал?', 2 * hour),
      msg(ME_ID, 'Да, мам 🙂', 2 * hour - 10 * min),
      msg('u10', 'Позвони вечером, пожалуйста ❤️', 40 * min),
    ],
  },
  {
    id: 'ch-c7', type: 'channel', title: 'Технологии', avatar: photo('tech-av', 200, 200), memberIds: ['c7'], subscribers: 640_000, unread: 12, muted: true,
    messages: [
      msg('c7', '⚡️ Вышло крупное обновление мессенджеров: теперь истории можно публиковать прямо из ленты.', 1 * day),
      msg('c7', '📱 Обзор новых смартфонов осени — уже в нашей ленте.', 8 * hour, { sharedPostId: 'p12' }),
      msg('c7', '🤖 Нейросети научились монтировать видео за секунды. Что думаете?', 3 * hour),
    ],
  },
  {
    id: 'ch-u2', type: 'private', peerId: 'u2', memberIds: [ME_ID, 'u2'], unread: 0,
    messages: [
      msg('u2', 'Скинь, пожалуйста, ссылку на тот репозиторий', 1 * day + 5 * hour),
      msg(ME_ID, 'github.com/msggs/social-net', 1 * day + 4 * hour),
      msg('u2', 'Спасибо!', 1 * day + 4 * hour - 2 * min),
    ],
  },
  {
    id: 'ch-g2', type: 'group', title: 'Работа · Проект', avatar: photo('grp2', 200, 200), memberIds: [ME_ID, 'u2', 'u5', 'u8'], unread: 0, muted: true,
    messages: [
      msg('u5', 'Макеты обновила, гляньте', 2 * day),
      msg('u8', 'Посмотрю после обеда', 2 * day - 1 * hour),
      msg(ME_ID, 'Супер, спасибо!', 2 * day - 2 * hour),
    ],
  },
  {
    id: 'ch-u3', type: 'private', peerId: 'u3', memberIds: [ME_ID, 'u3'], unread: 0,
    messages: [
      msg('u3', 'Смотри какое видео 😂', 3 * day, { sharedPostId: 'p4' }),
      msg(ME_ID, 'ахахаха', 3 * day - 5 * min),
    ],
  },
  {
    id: 'ch-c1', type: 'channel', title: 'Путешествия по России', avatar: photo('trv-av', 200, 200), memberIds: ['c1'], subscribers: 1_240_000, unread: 0,
    messages: [
      msg('c1', '🏔 Топ-5 мест для поездки этой зимой: Байкал, Шерегеш, Мурманск, Карелия, Алтай.', 2 * day),
      msg('c1', 'Новое видео про Байкал 👇', 5 * hour, { sharedPostId: 'p1' }),
    ],
  },
];

export const initialSettings: Settings = {
  theme: 'system',
  accent: '#2aabee',
  chatTextSize: 16,
  autoplay: true,
  dataSaver: false,
  soundOnStart: false,
  notifyPrivate: true,
  notifyGroups: true,
  notifyChannels: false,
  notifyActivity: true,
  notifySound: true,
  privatePhone: 'contacts',
  privateLastSeen: 'everyone',
  privateStories: 'contacts',
  privateMessages: 'everyone',
  privateAccount: false,
  readReceipts: true,
  twoFactor: false,
};

/** Заготовки ответов собеседников */
export const autoReplies = [
  'Ага 👍',
  'Интересно, расскажи подробнее',
  'Ахах 😂',
  'Ок, договорились!',
  'Сейчас не могу говорить, напишу позже',
  'Круто!',
  'Согласен(на)',
  'Давай 🙌',
  'Вот это да 😮',
  'Спасибо ❤️',
];
