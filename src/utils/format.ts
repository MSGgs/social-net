import type { Chat, Message, User } from '../types';

/** Абсолютная ссылка на экран приложения с учётом базового пути сайта */
export function appLink(path: string) {
  const base = import.meta.env.BASE_URL.startsWith('/') ? location.origin + import.meta.env.BASE_URL : location.href;
  return new URL(path.replace(/^\//, ''), base).href;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/** Русские формы множественного числа: plural(5, ['комментарий', 'комментария', 'комментариев']) */
export function plural(n: number, forms: [string, string, string]) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
  return forms[2];
}

/** 1234 → «1,2 тыс.», 2100000 → «2,1 млн» */
export function compact(n: number) {
  const fmt = (v: number) => v.toFixed(1).replace(/\.0$/, '').replace('.', ',');
  if (n >= 1_000_000) return `${fmt(n / 1_000_000)} млн`;
  if (n >= 10_000) return `${Math.round(n / 1000)} тыс.`;
  if (n >= 1000) return `${fmt(n / 1000)} тыс.`;
  return String(n);
}

const pad = (n: number) => String(n).padStart(2, '0');
const weekdays = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const clock = (t: number) => {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Время в списке чатов как в Telegram */
export function chatListTime(t: number) {
  const today = startOfDay(Date.now());
  if (t >= today) return clock(t);
  if (t >= today - 6 * 86_400_000) return weekdays[new Date(t).getDay()];
  const d = new Date(t);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`;
}

/** Разделитель дат внутри чата */
export function dayLabel(t: number) {
  const today = startOfDay(Date.now());
  const day = startOfDay(t);
  if (day === today) return 'Сегодня';
  if (day === today - 86_400_000) return 'Вчера';
  const d = new Date(t);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${d.getDate()} ${months[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`}`;
}

export const sameDay = (a: number, b: number) => startOfDay(a) === startOfDay(b);

/** «5 мин. назад», «3 ч. назад», «2 дн. назад» */
export function ago(t: number) {
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин. назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч. назад`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ${plural(d, ['день', 'дня', 'дней'])} назад`;
  return dayLabel(t);
}

export function presence(user: User) {
  if (user.online) return 'в сети';
  if (!user.lastSeen) return 'был(а) давно';
  const diff = Date.now() - user.lastSeen;
  if (diff < 60 * 60_000) return `был(а) ${Math.max(1, Math.floor(diff / 60_000))} мин. назад`;
  if (sameDay(user.lastSeen, Date.now())) return `был(а) в ${clock(user.lastSeen)}`;
  if (diff < 2 * 86_400_000) return `был(а) вчера в ${clock(user.lastSeen)}`;
  if (diff < 7 * 86_400_000) return 'был(а) на этой неделе';
  return 'был(а) недавно';
}

export const chatTitle = (chat: Chat, users: Record<string, User>) =>
  chat.type === 'private' && chat.peerId ? users[chat.peerId]?.name ?? 'Удалённый аккаунт' : chat.title ?? 'Чат';

export const chatAvatar = (chat: Chat, users: Record<string, User>) =>
  chat.type === 'private' && chat.peerId ? users[chat.peerId]?.avatar : chat.avatar;

export const lastMessage = (chat: Chat): Message | undefined => chat.messages[chat.messages.length - 1];

export function messagePreview(m: Message) {
  if (m.text) return m.text;
  if (m.sharedPostId) return '🎬 Публикация';
  if (m.image) return '🖼 Фото';
  return 'Сообщение';
}

/** Сжимает картинку из файла в data URL, чтобы она пережила перезагрузку */
export function fileToDataUrl(file: File, maxSide = 1080): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}
