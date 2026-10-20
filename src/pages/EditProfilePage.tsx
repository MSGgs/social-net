import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { useMe, useStore } from '../store/useStore';
import { fileToDataUrl } from '../utils/format';

export function EditProfilePage() {
  const navigate = useNavigate();
  const me = useMe();
  const { updateMe, toast } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: me.name, username: me.username, bio: me.bio ?? '', phone: me.phone ?? '', avatar: me.avatar });

  const usernameOk = /^[a-z0-9._]{3,30}$/.test(form.username);
  const valid = form.name.trim().length > 0 && usernameOk;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: k === 'username' ? e.target.value.toLowerCase() : e.target.value });

  const save = () => {
    if (!valid) return;
    updateMe({ ...form, name: form.name.trim(), bio: form.bio.trim() });
    toast('Профиль сохранён');
    navigate(-1);
  };

  return (
    <div className="screen page">
      <header className="page-header">
        <button className="link-btn" onClick={() => navigate(-1)}>
          Отмена
        </button>
        <h1 className="small">Редактирование</h1>
        <button className="link-btn bold" onClick={save} disabled={!valid}>
          Готово
        </button>
      </header>
      <div className="page-scroll">
        <div className="edit-avatar">
          <Avatar src={form.avatar} name={form.name} size={96} onClick={() => fileRef.current?.click()} />
          <button className="link-btn" onClick={() => fileRef.current?.click()}>
            <Camera size={16} /> Изменить фото
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setForm({ ...form, avatar: await fileToDataUrl(f, 400) });
            }}
          />
        </div>
        <div className="group">
          <label className="field">
            <span>Имя</span>
            <input value={form.name} onChange={set('name')} maxLength={64} />
          </label>
          <label className="field">
            <span>Имя пользователя</span>
            <input value={form.username} onChange={set('username')} maxLength={30} />
          </label>
          <label className="field">
            <span>О себе</span>
            <textarea value={form.bio} onChange={set('bio')} rows={3} maxLength={150} />
          </label>
          <label className="field">
            <span>Телефон</span>
            <input value={form.phone} onChange={set('phone')} inputMode="tel" />
          </label>
        </div>
        <p className="hint">
          {usernameOk
            ? `Вас смогут найти по ссылке volna.app/${form.username}. Описание: ${form.bio.length}/150`
            : 'Имя пользователя: 3–30 символов — латиница, цифры, точка и подчёркивание.'}
        </p>
      </div>
    </div>
  );
}
