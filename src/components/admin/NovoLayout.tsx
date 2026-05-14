import React, { useState } from 'react';
import { useIsMaster } from '@/hooks/useIsMaster';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { type UserRole, type ViewType } from '@/utils/accessControl';

const C = {
  NV:  '#0D1B2A',
  NV2: '#1A2E42',
  LJ:  '#E8510A',
  FD:  '#F5F3EF',
  BD:  '#E0DDD7',
  CZ:  '#6B6760',
  white: '#FFFFFF',
  whiteMuted: 'rgba(255,255,255,0.55)',
  hoverSidebar: 'rgba(255,255,255,0.07)',
  activeSidebar: 'rgba(232,81,10,0.18)',
};

interface MenuItem { label: string; view: ViewType; icon: string; badge?: number }
interface MenuGroup { title: string; items: MenuItem[] }

interface NovoLayoutProps {
  activeView: ViewType;
  onViewChange: (view: string) => void;
  userRole: UserRole;
  userName: string;
  onSignOut: () => void;
  children: React.ReactNode;
}

const FULL_SCREEN_VIEWS: ViewType[] = ['crm-orcamentos', 'crm-marcenaria', 'cs-pipeline', 'funil-vendas-admin'];

export function NovoLayout({ activeView, onViewChange, userRole, userName, onSignOut, children }: NovoLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isMaster = useIsMaster();
  const { notifications } = useAdminNotifications();

  const buildMenuGroups = (): MenuGroup[] => {
    const isAdmin = userRole === 'admin' || userRole === 'master';
    const isGestor = userRole === 'gestor_conta';
    const isSDR = userRole === 'sdr';

    if (isSDR) {
      return [
        {
          title: 'SDR',
          items: [
            { label: 'Atendimento', view: 'sdr-atendimento', icon: '📋' },
            { label: 'Inteligência CEP', view: 'sdr-inteligencia', icon: '🗺️' },
          ]
        },
        {
          title: 'Orçamentos',
          items: [
            { label: 'Gerenciar', view: 'lista', icon: '📁' },
          ]
        }
      ];
    }

    if (isGestor) {
      return [
        {
          title: 'Início',
          items: [
            { label: 'Dashboard', view: 'dashboard-operacional', icon: '🏠' },
          ]
        },
        {
          title: 'Orçamentos',
          items: [
            { label: 'Gerenciar', view: 'lista', icon: '📁' },
            { label: 'CRM Kanban', view: 'crm-orcamentos', icon: '📊' },
          ]
        },
        {
          title: 'Análises',
          items: [
            { label: 'Relatórios', view: 'relatorios', icon: '📈' },
            { label: 'Calculadora', view: 'calculadora-financiamento', icon: '🧮' },
          ]
        }
      ];
    }

    // Admin / Master
    const groups: MenuGroup[] = [
      {
        title: 'Início',
        items: [
          { label: 'Dashboard', view: 'dashboard-operacional', icon: '🏠' },
          { label: 'Inteligência CEP', view: 'sdr-inteligencia', icon: '🗺️' },
        ]
      },
      {
        title: 'Orçamentos',
        items: [
          { label: 'Gerenciar', view: 'lista', icon: '📁' },
          { label: 'CRM Kanban', view: 'crm-orcamentos', icon: '📊' },
          { label: 'CRM Marcenaria', view: 'crm-marcenaria', icon: '🪚' },
          { label: 'Motivos de Perda', view: 'crm-motivos-perda', icon: '❌' },
          { label: 'Checklists CRM', view: 'crm-checklist-config', icon: '✅' },
          { label: 'Produtividade', view: 'produtividade-checklist', icon: '📈' },
        ]
      },
      {
        title: 'Pipeline',
        items: [
          { label: 'Pipeline CS', view: 'cs-pipeline', icon: '🤝' },
          { label: 'Funil Vendas', view: 'funil-vendas-admin', icon: '🔽' },
        ]
      },
      {
        title: 'Gestão',
        items: [
          { label: 'Aprovações', view: 'aprovacoes', icon: '✔️' },
          { label: 'Usuários', view: 'usuarios', icon: '👥' },
          {
            label: 'Controle',
            view: 'controle',
            icon: '🎛️',
            badge: notifications.total > 0 ? notifications.total : undefined
          },
          { label: 'Reputação', view: 'reputacao', icon: '⭐' },
        ]
      },
      {
        title: 'Análises',
        items: [
          { label: 'Relatórios', view: 'relatorios', icon: '📊' },
          { label: 'Propostas', view: 'propostas', icon: '📄' },
          { label: 'Comparador', view: 'comparador', icon: '⚖️' },
        ]
      },
    ];

    if (isMaster) {
      groups.push({
        title: 'Financeiro',
        items: [{ label: 'Dashboard', view: 'financeiro', icon: '💰' }]
      });
      groups.push({
        title: 'Sistema',
        items: [
          { label: 'Saúde da Empresa', view: 'saude-empresa', icon: '❤️' },
          { label: 'Produtos', view: 'produtos-segmentacao', icon: '🏷️' },
          { label: 'Avisos', view: 'avisos', icon: '📢' },
          { label: 'Base de Preços', view: 'gestao-fontes', icon: '📐' },
          { label: 'Integridade', view: 'integridade', icon: '🛡️' },
          { label: 'Recuperação', view: 'recuperacao', icon: '🔧' },
        ]
      });
    } else {
      groups.push({
        title: 'Sistema',
        items: [
          { label: 'Base de Preços', view: 'gestao-fontes', icon: '📐' },
          { label: 'Integridade', view: 'integridade', icon: '🛡️' },
          { label: 'Recuperação', view: 'recuperacao', icon: '🔧' },
        ]
      });
    }

    return groups;
  };

  const menuGroups = buildMenuGroups();
  const isFullScreen = FULL_SCREEN_VIEWS.includes(activeView);
  const initials = userName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const sidebarW = collapsed ? 52 : 220;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: '"DM Sans", sans-serif', background: C.FD }}>
      {/* Header */}
      <header style={{
        height: 52,
        minHeight: 52,
        background: C.NV,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        zIndex: 50,
        flexShrink: 0,
      }}>
        <button
          onClick={() => setCollapsed(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.white, padding: '4px', display: 'flex', alignItems: 'center' }}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>☰</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img
            src="/lovable-uploads/c483ce15-6db9-4eca-8544-1eeb29c9b346.png"
            alt="R100"
            style={{ height: 28, width: 'auto', objectFit: 'contain' }}
          />
          {!collapsed && (
            <span style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: 16, color: C.white, letterSpacing: '-0.3px' }}>
              Reforma100
            </span>
          )}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: C.whiteMuted }}>Olá, {userName.split(' ')[0]}</span>
          <button
            onClick={onSignOut}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 6,
              color: C.white,
              fontSize: 12,
              padding: '4px 10px',
              cursor: 'pointer',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            Sair
          </button>
        </div>
      </header>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside style={{
          width: sidebarW,
          minWidth: sidebarW,
          background: C.NV2,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden',
          transition: 'width 0.2s ease',
          flexShrink: 0,
        }}>
          <nav style={{ flex: 1, padding: '8px 0' }}>
            {menuGroups.map(group => (
              <div key={group.title} style={{ marginBottom: 4 }}>
                {!collapsed && (
                  <div style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: C.whiteMuted,
                    padding: '10px 14px 4px',
                  }}>
                    {group.title}
                  </div>
                )}
                {group.items.map(item => {
                  const isActive = activeView === item.view;
                  return (
                    <button
                      key={item.view}
                      onClick={() => onViewChange(item.view)}
                      title={collapsed ? item.label : undefined}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: collapsed ? 0 : 9,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        width: '100%',
                        padding: collapsed ? '9px 0' : '8px 14px',
                        background: isActive ? C.activeSidebar : 'none',
                        borderLeft: isActive ? `3px solid ${C.LJ}` : '3px solid transparent',
                        border: 'none',
                        borderRight: 'none',
                        borderTop: 'none',
                        borderBottom: 'none',
                        cursor: 'pointer',
                        color: isActive ? C.white : C.whiteMuted,
                        fontSize: 13,
                        fontFamily: '"DM Sans", sans-serif',
                        fontWeight: isActive ? 600 : 400,
                        textAlign: 'left',
                        position: 'relative',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = C.hoverSidebar; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                    >
                      <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
                      {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                      {!collapsed && item.badge && item.badge > 0 && (
                        <span style={{
                          background: C.LJ,
                          color: C.white,
                          fontSize: 10,
                          fontWeight: 700,
                          borderRadius: 10,
                          padding: '1px 6px',
                          marginLeft: 4,
                        }}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Bottom user info */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            padding: collapsed ? '10px 0' : '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            <div style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: C.LJ,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontFamily: '"Syne", sans-serif',
              fontWeight: 700,
              fontSize: 12,
              color: C.white,
            }}>
              {initials}
            </div>
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.white, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userName.split(' ').slice(0, 2).join(' ')}
                </div>
                <div style={{ fontSize: 10, color: C.whiteMuted, textTransform: 'capitalize' }}>
                  {userRole.replace(/_/g, ' ')}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main style={{
          flex: 1,
          overflow: isFullScreen ? 'hidden' : 'auto',
          display: isFullScreen ? 'flex' : 'block',
          flexDirection: isFullScreen ? 'column' : undefined,
          background: C.FD,
          padding: isFullScreen ? 0 : 24,
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
