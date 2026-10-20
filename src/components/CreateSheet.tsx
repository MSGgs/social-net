import { useRef, useState } from 'react';
import { Camera, Clapperboard, ImagePlus, X } from 'lucide-react';
import { Sheet } from './Sheet';
import { useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import { fileToDataUrl } from '../utils/format';

interface Draft {
  type: 'photo' | 'video';
  media: string[];
}

/** Создание публикации (фото/видео в ленту) или истории */
export function CreateSheet() {
  const mode = useUI((s) => s.createMode);
  const openCreate = useUI((s) => s.openCreate);
  const { addPost, addStory, toast } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');

  const close = () => {
    openCreate(null);
    setDraft(null);
    setCaption('');
    setLocation('');
  };

  const pick = () => fileRef.current?.click();

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    const isVideo = list[0].type.startsWith('video/');
    try {
      if (mode === 'story') {
        const f = list[0];
        const url = isVideo ? URL.createObjectURL(f) : await fileToDataUrl(f, 1280);
        addStory({ type: isVideo ? 'video' : 'image', url });
        close();
        return;
      }
      const media = isVideo
        ? [URL.createObjectURL(list[0])]
        : await Promise.all(list.filter((f) => f.type.startsWith('image/')).slice(0, 10).map((f) => fileToDataUrl(f)));
      setDraft({ type: isVideo ? 'video' : 'photo', media });
      openCreate('post');
    } catch {
      toast('Не удалось открыть файл');
    }
  };

  const publish = () => {
    if (!draft) return;
    addPost({ type: draft.type, media: draft.media, caption: caption.trim(), location: location.trim() || undefined });
    close();
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        hidden
        multiple={mode !== 'story'}
        accept="image/*,video/*"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <Sheet open={mode === 'menu'} onClose={close} title="Создать">
        <div className="action-list">
          <button className="action-item" onClick={() => { openCreate('post'); pick(); }}>
            <ImagePlus size={22} /> <span>Публикация — фото или карусель</span>
          </button>
          <button className="action-item" onClick={() => { openCreate('post'); pick(); }}>
            <Clapperboard size={22} /> <span>Видео в ленту</span>
          </button>
          <button className="action-item" onClick={() => { openCreate('story'); pick(); }}>
            <Camera size={22} /> <span>История на 24 часа</span>
          </button>
        </div>
      </Sheet>
      <Sheet open={mode === 'story'} onClose={close} title="Новая история">
        <div className="create-empty">
          <p className="muted">Выберите фото или видео — история будет видна вашим контактам 24 часа.</p>
          <button className="btn primary" onClick={pick}>
            <Camera size={18} /> Выбрать из галереи
          </button>
        </div>
      </Sheet>
      <Sheet open={mode === 'post'} onClose={close} tall title="Новая публикация">
        {!draft ? (
          <div className="create-empty">
            <p className="muted">Добавьте фото (до 10 штук) или одно видео.</p>
            <button className="btn primary" onClick={pick}>
              <ImagePlus size={18} /> Выбрать файлы
            </button>
          </div>
        ) : (
          <div className="create-form">
            <div className="create-preview">
              {draft.media.map((src, i) => (
                <div key={i} className="create-thumb">
                  {draft.type === 'video' ? <video src={src} muted playsInline autoPlay loop /> : <img src={src} alt="" />}
                  {draft.type === 'photo' && (
                    <button
                      className="create-remove"
                      onClick={() => {
                        const media = draft.media.filter((_, j) => j !== i);
                        setDraft(media.length ? { ...draft, media } : null);
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Добавьте подпись… #хэштеги" rows={3} />
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Место (необязательно)" />
            <button className="btn primary block" onClick={publish}>
              Опубликовать
            </button>
          </div>
        )}
      </Sheet>
    </>
  );
}
