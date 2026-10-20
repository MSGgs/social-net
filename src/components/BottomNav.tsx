import { NavLink, useLocation } from 'react-router-dom';
import { Clapperboard, MessageCircle, UserRound, Users } from 'lucide-react';
import { useStore, useMe } from '../store/useStore';

export function BottomNav() {
  const { pathname } = useLocation();
  const me = useMe();
  const unreadChats = useStore((s) => s.chats.filter((c) => c.unread > 0 && !c.muted && !c.archived).length);
  const dark = pathname === '/';

  const items = [
    { to: '/contacts', label: 'Контакты', icon: <Users size={24} /> },
    { to: '/', label: 'Лента', icon: <Clapperboard size={24} /> },
    { to: '/chats', label: 'Чаты', icon: <MessageCircle size={24} />, badge: unreadChats },
    {
      to: '/profile',
      label: 'Профиль',
      icon: me.avatar ? <img className="nav-avatar" src={me.avatar} alt="" /> : <UserRound size={24} />,
    },
  ];

  return (
    <nav className={`bottom-nav ${dark ? 'dark' : ''}`}>
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">
            {it.icon}
            {!!it.badge && <span className="nav-badge">{it.badge}</span>}
          </span>
          <span className="nav-label">{it.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
