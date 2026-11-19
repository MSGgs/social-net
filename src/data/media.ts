/**
 * Источники демо-медиа. По умолчанию — внешние сервисы с фото и видео.
 * В демо-сборке (VITE_LOCAL_MEDIA=1) — файлы из public/media,
 * которые генерирует scripts/gen-demo-media.py: так демо работает без доступа к внешним хостам.
 */
const local = import.meta.env.VITE_LOCAL_MEDIA === '1';
// BASE_URL — «/» локально, «/social-net/» на GitHub Pages, «./» во встраиваемой сборке
const base = import.meta.env.BASE_URL;

export const avatar = (n: number) => (local ? undefined : `https://i.pravatar.cc/200?img=${n}`);

export const avatarFor = (key: string) => (local ? undefined : `https://i.pravatar.cc/200?u=${encodeURIComponent(key)}`);

export const photo = (seed: string, w = 720, h = 960) =>
  local ? `${base}media/${seed}.jpg` : `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const video = (name: string) =>
  local ? `${base}media/${name}.mp4` : `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/${name}.mp4`;

/** Обложка для новой группы: в демо-режиме — буквы вместо картинки */
export const groupCover = (id: string) => (local ? undefined : `https://picsum.photos/seed/${id}/200/200`);
