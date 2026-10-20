import { useState, type ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Bell, Bookmark, Check, ChevronLeft, ChevronRight, CircleHelp, Database, Globe, Info, KeyRound, LogOut,
  Monitor, MonitorSmartphone, Moon, Palette, Shield, Smartphone, Sun, Trash2,
} from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Sheet } from '../components/Sheet';
import { useMe, useStore } from '../store/useStore';
import type { Audience, Settings } from '../types';

const audienceLabel: Record<Audience, string> = { everyone: 'Все', contacts: 'Мои контакты', nobody: 'Никто' };
const accents = ['#2aabee', '#ff2d55', '#34c759', '#af52de', '#ff9500', '#5856d6'];

function Row({ icon, color, label, value, onClick, danger }: { icon?: ReactNode; color?: string; label: string; value?: ReactNode; onClick?: () => void; danger?: boolean }) {
  return (
    <button className={`settings-row ${danger ? 'danger' : ''}`} onClick={onClick}>
      {icon && <span className="list-icon" style={{ background: color }}>{icon}</span>}
      <span className="settings-label">{label}</span>
      {value !== undefined && <span className="settings-value">{value}</span>}
      {onClick && !danger && <ChevronRight size={18} className="muted" />}
    </button>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="settings-row">
      <span className="settings-label">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <input type="checkbox" className="switch" checked={value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function Header({ title }: { title: string }) {
  const navigate = useNavigate();
  return (
    <header className="page-header">
      <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
        <ChevronLeft size={28} />
      </button>
      <h1 className="small">{title}</h1>
      <span className="header-spacer" />
    </header>
  );
}

export function SettingsPage() {
  const { section } = useParams();
  if (!section) return <SettingsRoot />;
  const Section = sections[section];
  return Section ? <Section /> : <Navigate to="/settings" replace />;
}

function SettingsRoot() {
  const navigate = useNavigate();
  const me = useMe();
  const settings = useStore((s) => s.settings);
  const { resetAll, toast } = useStore();
  const [confirm, setConfirm] = useState(false);
  const go = (s: string) => () => navigate(`/settings/${s}`);

  return (
    <div className="screen page settings">
      <Header title="Настройки" />
      <div className="page-scroll">
        <button className="settings-profile" onClick={() => navigate('/profile/edit')}>
          <Avatar src={me.avatar} name={me.name} size={64} />
          <div className="settings-profile-text">
            <b>{me.name}</b>
            <span>{me.phone}</span>
            <span>@{me.username}</span>
          </div>
          <ChevronRight size={18} className="muted" />
        </button>

        <div className="group">
          <Row icon={<Bookmark size={18} />} color="#2aabee" label="Сохранённое" onClick={() => navigate('/profile?tab=saved')} />
          <Row icon={<MonitorSmartphone size={18} />} color="#ff9500" label="Устройства" value="3" onClick={go('devices')} />
        </div>

        <div className="group">
          <Row icon={<Bell size={18} />} color="#ff3b30" label="Уведомления и звуки" onClick={go('notifications')} />
          <Row icon={<Shield size={18} />} color="#8e8e93" label="Конфиденциальность" onClick={go('privacy')} />
          <Row icon={<Database size={18} />} color="#34c759" label="Данные и память" onClick={go('data')} />
          <Row icon={<Palette size={18} />} color="#5ac8fa" label="Оформление" value={settings.theme === 'dark' ? 'Тёмное' : settings.theme === 'light' ? 'Светлое' : 'Системное'} onClick={go('appearance')} />
          <Row icon={<Globe size={18} />} color="#af52de" label="Язык" value="Русский" onClick={() => toast('Скоро добавим другие языки')} />
        </div>

        <div className="group">
          <Row icon={<CircleHelp size={18} />} color="#ff9500" label="Задать вопрос" onClick={() => toast('Поддержка ответит в течение часа')} />
          <Row icon={<Info size={18} />} color="#2aabee" label="О приложении" value="Волна 0.1.0" />
        </div>

        <div className="group">
          <Row icon={<LogOut size={18} />} color="#ff3b30" label="Выйти и сбросить данные" danger onClick={() => setConfirm(true)} />
        </div>
        <p className="hint center">Волна — видео, истории и чаты в одном приложении</p>
      </div>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Выйти из аккаунта?">
        <div className="form">
          <p className="muted center">Все ваши публикации, чаты и настройки на этом устройстве будут сброшены к демо-данным.</p>
          <button
            className="btn danger block"
            onClick={() => {
              resetAll();
              setConfirm(false);
              navigate('/');
              toast('Данные сброшены');
            }}
          >
            Выйти
          </button>
          <button className="btn secondary block" onClick={() => setConfirm(false)}>
            Отмена
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function useSettings() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const bind = <K extends keyof Settings>(key: K) => ({
    value: settings[key],
    onChange: (v: Settings[K]) => update({ [key]: v } as Partial<Settings>),
  });
  return { settings, update, bind };
}

function NotificationsSection() {
  const { bind } = useSettings();
  return (
    <div className="screen page settings">
      <Header title="Уведомления" />
      <div className="page-scroll">
        <div className="section-title">Сообщения</div>
        <div className="group">
          <Toggle label="Личные чаты" {...bind('notifyPrivate')} />
          <Toggle label="Группы" {...bind('notifyGroups')} />
          <Toggle label="Каналы" {...bind('notifyChannels')} />
        </div>
        <div className="section-title">Лента</div>
        <div className="group">
          <Toggle label="Лайки и комментарии" hint="Когда кто-то реагирует на ваши публикации" {...bind('notifyActivity')} />
        </div>
        <div className="group">
          <Toggle label="Звук в приложении" {...bind('notifySound')} />
        </div>
      </div>
    </div>
  );
}

function PrivacySection() {
  const { settings, update, bind } = useSettings();
  const [picker, setPicker] = useState<null | { key: 'privatePhone' | 'privateLastSeen' | 'privateStories' | 'privateMessages'; title: string }>(null);
  const toast = useStore((s) => s.toast);
  const pickers = [
    { key: 'privatePhone', title: 'Номер телефона' },
    { key: 'privateLastSeen', title: 'Время захода' },
    { key: 'privateStories', title: 'Кто видит мои истории' },
    { key: 'privateMessages', title: 'Кто может мне писать' },
  ] as const;

  return (
    <div className="screen page settings">
      <Header title="Конфиденциальность" />
      <div className="page-scroll">
        <div className="section-title">Кто может видеть</div>
        <div className="group">
          {pickers.map((p) => (
            <Row key={p.key} label={p.title} value={audienceLabel[settings[p.key]]} onClick={() => setPicker(p)} />
          ))}
        </div>
        <div className="group">
          <Toggle label="Закрытый аккаунт" hint="Публикации в ленте увидят только ваши контакты" {...bind('privateAccount')} />
          <Toggle label="Отчёты о прочтении" hint="Показывать собеседникам, что вы прочитали сообщение" {...bind('readReceipts')} />
        </div>
        <div className="section-title">Безопасность</div>
        <div className="group">
          <Toggle label="Двухэтапная аутентификация" {...bind('twoFactor')} />
          <Row icon={<KeyRound size={18} />} color="#34c759" label="Код-пароль" onClick={() => toast('Код-пароль установлен')} />
        </div>
      </div>
      <Sheet open={!!picker} onClose={() => setPicker(null)} title={picker?.title}>
        <div className="action-list">
          {(Object.keys(audienceLabel) as Audience[]).map((a) => (
            <button
              key={a}
              className="action-item"
              onClick={() => {
                if (picker) update({ [picker.key]: a });
                setPicker(null);
              }}
            >
              <span>{audienceLabel[a]}</span>
              {picker && settings[picker.key] === a && <Check size={20} className="accent" />}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

function DataSection() {
  const { bind } = useSettings();
  const toast = useStore((s) => s.toast);
  const used = (() => {
    try {
      return ((localStorage.getItem('volna-store')?.length ?? 0) / 1024).toFixed(0);
    } catch {
      return '0';
    }
  })();
  return (
    <div className="screen page settings">
      <Header title="Данные и память" />
      <div className="page-scroll">
        <div className="section-title">Лента</div>
        <div className="group">
          <Toggle label="Автовоспроизведение видео" {...bind('autoplay')} />
          <Toggle label="Звук при запуске" hint="Видео в ленте будут сразу со звуком" {...bind('soundOnStart')} />
          <Toggle label="Экономия трафика" hint="Видео загружаются в меньшем качестве" {...bind('dataSaver')} />
        </div>
        <div className="section-title">Хранилище</div>
        <div className="group">
          <Row label="Занято на устройстве" value={`${used} КБ`} />
          <Row icon={<Trash2 size={18} />} color="#ff3b30" label="Очистить кэш медиа" onClick={() => toast('Кэш очищен')} />
        </div>
      </div>
    </div>
  );
}

function AppearanceSection() {
  const { settings, update } = useSettings();
  const themes = [
    { id: 'system', label: 'Системная', icon: <Monitor size={22} /> },
    { id: 'light', label: 'Светлая', icon: <Sun size={22} /> },
    { id: 'dark', label: 'Тёмная', icon: <Moon size={22} /> },
  ] as const;

  return (
    <div className="screen page settings">
      <Header title="Оформление" />
      <div className="page-scroll">
        <div className="section-title">Тема</div>
        <div className="theme-picker">
          {themes.map((t) => (
            <button key={t.id} className={settings.theme === t.id ? 'active' : ''} onClick={() => update({ theme: t.id })}>
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        <div className="section-title">Цвет акцента</div>
        <div className="accent-picker">
          {accents.map((c) => (
            <button key={c} style={{ background: c }} className={settings.accent === c ? 'active' : ''} onClick={() => update({ accent: c })} aria-label={c}>
              {settings.accent === c && <Check size={18} strokeWidth={3} />}
            </button>
          ))}
        </div>
        <div className="section-title">Размер текста в чатах · {settings.chatTextSize}</div>
        <div className="group pad">
          <input
            type="range"
            min={13}
            max={22}
            value={settings.chatTextSize}
            onChange={(e) => update({ chatTextSize: Number(e.target.value) })}
            className="range"
          />
          <div className="bubble-preview">
            <div className="bubble in tail" style={{ fontSize: settings.chatTextSize }}>Привет! Как тебе новая тема? 🙂</div>
            <div className="bubble out tail" style={{ fontSize: settings.chatTextSize }}>Выглядит отлично!</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DevicesSection() {
  const toast = useStore((s) => s.toast);
  const devices = [
    { name: 'Волна для iPhone', place: 'Москва, Россия', time: 'в сети', current: true },
    { name: 'Волна Web · Chrome', place: 'Москва, Россия', time: 'вчера' },
    { name: 'Волна для Android', place: 'Санкт-Петербург, Россия', time: '12 окт.' },
  ];
  return (
    <div className="screen page settings">
      <Header title="Устройства" />
      <div className="page-scroll">
        <div className="group">
          {devices.map((d) => (
            <div key={d.name} className="settings-row">
              <span className="list-icon" style={{ background: d.current ? '#34c759' : '#8e8e93' }}>
                <Smartphone size={18} />
              </span>
              <span className="settings-label">
                {d.name}
                <small>
                  {d.place} · {d.time}
                </small>
              </span>
            </div>
          ))}
        </div>
        <div className="group">
          <Row label="Завершить другие сеансы" danger onClick={() => toast('Другие сеансы завершены')} />
        </div>
      </div>
    </div>
  );
}

const sections: Record<string, () => ReactNode> = {
  notifications: NotificationsSection,
  privacy: PrivacySection,
  data: DataSection,
  appearance: AppearanceSection,
  devices: DevicesSection,
};
