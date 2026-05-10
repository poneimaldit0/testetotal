import { useState } from "react"
import { 
  BarChart3, 
  FileText, 
  Users, 
  UserCheck, 
  Award, 
  TrendingUp, 
  DollarSign,
  Plus,
  Settings,
  CheckCircle,
  HelpCircle,
  Briefcase,
  Bell,
  Database,
  Wrench,
  Megaphone,
  Calculator,
  Kanban,
  XCircle,
  CheckSquare,
  Activity,
  HeartHandshake
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useIsMaster } from "@/hooks/useIsMaster"
import { useAdminNotifications } from "@/hooks/useAdminNotifications"
import { useNotificacoesFornecedor } from "@/hooks/useNotificacoesFornecedor"
import { useRevisoesWorkflow } from "@/hooks/useRevisoesWorkflow"
import { NotificationCenter } from "@/components/fornecedor/NotificationCenter"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

interface MenuItem {
  title: string
  icon: any
  value: string
  badge?: number
}

interface MenuGroup {
  label: string
  items: MenuItem[]
}

interface AppSidebarProps {
  activeView: string
  onViewChange: (view: string) => void
}

export function AppSidebar({ activeView, onViewChange }: AppSidebarProps) {
  const { state } = useSidebar()
  const { profile } = useAuth()
  const isMaster = useIsMaster()
  const { notifications } = useAdminNotifications()
  const { naoLidas } = useNotificacoesFornecedor()
  const { totalRevisoesPendentes } = useRevisoesWorkflow()
  
  const collapsed = state === "collapsed"

  if (!profile) return null

  // Menu para Fornecedores
  const fornecedorMenuGroups: MenuGroup[] = [
    {
      label: "Operacional",
      items: [
        { title: "Central", icon: Briefcase, value: "central" },
        { title: "Disponíveis", icon: FileText, value: "disponiveis" },
      ]
    },
    {
      label: "Perfil",
      items: [
        { title: "Editar Perfil", icon: Settings, value: "perfil" }
      ]
    }
  ]

  // Menu para Gestores de Conta
  const gestorMenuGroups: MenuGroup[] = [
    {
      label: "Orçamentos",
      items: [
        { title: "Gerenciar", icon: FileText, value: "lista" },
        { title: "Cadastrar Novo", icon: Plus, value: "cadastro" },
        { title: "CRM Kanban", icon: Kanban, value: "crm-orcamentos" }
      ]
    },
    {
      label: "Análises",
      items: [
        { title: "Relatórios", icon: BarChart3, value: "relatorios" }
      ]
    },
    {
      label: "Ferramentas",
      items: [
        { title: "Calculadora ReformaCred", icon: Calculator, value: "calculadora-financiamento" }
      ]
    }
  ]

  // Menu para SDR (Sales Development Representative)
  const sdrMenuGroups: MenuGroup[] = [
    {
      label: "Orçamentos",
      items: [
        { title: "Gerenciar", icon: FileText, value: "lista" },
        { title: "Cadastrar Novo", icon: Plus, value: "cadastro" }
      ]
    }
  ]

  // Menu para Customer Success
  const csMenuGroups: MenuGroup[] = [
    {
      label: "Customer Success",
      items: [
        { title: "Dashboard CS", icon: BarChart3, value: "cs-dashboard" },
        { title: "Pipeline CS", icon: HeartHandshake, value: "cs-pipeline" }
      ]
    },
    {
      label: "Orçamentos",
      items: [
        { title: "Gerenciar", icon: FileText, value: "lista" },
        { title: "Cadastrar Novo", icon: Plus, value: "cadastro" }
      ]
    },
    {
      label: "CRM",
      items: [
        { title: "CRM Kanban", icon: Kanban, value: "crm-orcamentos" },
        { title: "🪚 CRM Marcenaria", icon: Kanban, value: "crm-marcenaria" }
      ]
    },
    {
      label: "Fornecedores",
      items: [
        { title: "Gerenciar Usuários", icon: Users, value: "usuarios" },
        { title: "Aprovar Cadastros", icon: UserCheck, value: "aprovacoes" },
        { title: "Reputação", icon: Award, value: "reputacao" }
      ]
    },
    {
      label: "Suporte",
      items: [
        { title: "Solicitações de Ajuda", icon: HelpCircle, value: "suporte" }
      ]
    },
    {
      label: "Análises",
      items: [
        { title: "Relatórios", icon: BarChart3, value: "relatorios" }
      ]
    }
  ]

  // Menu para Gestor Marcenaria
  const gestorMarcenariaMenuGroups: MenuGroup[] = [
    {
      label: "CRM Marcenaria",
      items: [
        { title: "🪚 Meus Leads", icon: Kanban, value: "crm-marcenaria" }
      ]
    },
    {
      label: "Ferramentas",
      items: [
        { title: "Calculadora ReformaCred", icon: Calculator, value: "calculadora-financiamento" }
      ]
    }
  ]

  // Menu para Consultor de Marcenaria - vê apenas seus leads apropriados
  const consultorMarcenariaMenuGroups: MenuGroup[] = [
    {
      label: "Meus Leads",
      items: [
        { title: "🪚 Leads Marcenaria", icon: Kanban, value: "crm-marcenaria" }
      ]
    },
    {
      label: "Ferramentas",
      items: [
        { title: "Calculadora ReformaCred", icon: Calculator, value: "calculadora-financiamento" }
      ]
    }
  ]

  // Menu para Closer
  const closerMenuGroups: MenuGroup[] = [
    {
      label: "Funil de Vendas",
      items: [
        { title: "Meu Funil", icon: TrendingUp, value: "funil-vendas" }
      ]
    }
  ]

  // Menu para Pré-Vendas
  const preVendasMenuGroups: MenuGroup[] = [
    {
      label: "SDR Fornecedor",
      items: [
        { title: "Meu Funil", icon: TrendingUp, value: "funil-vendas" }
      ]
    }
  ]

  // Menu para Admin/Master
  const adminMenuGroups: MenuGroup[] = [
    {
      label: "Orçamentos",
      items: [
        { title: "Gerenciar", icon: FileText, value: "lista" },
        { title: "Cadastrar Novo", icon: Plus, value: "cadastro" },
        { title: "CRM Kanban", icon: Kanban, value: "crm-orcamentos" },
        { title: "🪚 CRM Marcenaria", icon: Kanban, value: "crm-marcenaria" },
        { title: "CRM - Motivos de Perda", icon: XCircle, value: "crm-motivos-perda" },
        { title: "Checklists CRM", icon: CheckSquare, value: "crm-checklist-config" },
        { title: "Produtividade Checklist", icon: TrendingUp, value: "produtividade-checklist" }
      ]
    },
    {
      label: "Customer Success",
      items: [
        { title: "Pipeline CS", icon: HeartHandshake, value: "cs-pipeline" }
      ]
    },
    {
      label: "Funil de Vendas",
      items: [
        { title: "Gestão Funil", icon: TrendingUp, value: "funil-vendas-admin" }
      ]
    },
    {
      label: "Gestão",
      items: [
        { title: "Aprovações", icon: CheckCircle, value: "aprovacoes" },
        { title: "Usuários", icon: Users, value: "usuarios" }
      ]
    },
    {
      label: "Análises",
      items: [
        { title: "Relatórios", icon: BarChart3, value: "relatorios" },
        { title: "Propostas", icon: FileText, value: "propostas" },
        { title: "Comparador", icon: BarChart3, value: "comparador" }
      ]
    },
    {
      label: "Operações",
      items: [
        { 
          title: "Controle Propostas", 
          icon: TrendingUp, 
          value: "controle",
          badge: notifications.total > 0 ? notifications.total : undefined
        },
        { title: "Reputação", icon: Award, value: "reputacao" }
      ]
    },
    ...(isMaster ? [{
      label: "Financeiro",
      items: [
        { title: "Dashboard", icon: DollarSign, value: "financeiro" }
      ]
    }] : []),
    ...(isMaster ? [{
      label: "Gestão Executiva",
      items: [
        { title: "Saúde da Empresa", icon: Activity, value: "saude-empresa" }
      ]
    }] : []),
    ...(isMaster ? [{
      label: "Sistema",
      items: [
        { title: "Produtos/Segmentação", icon: Settings, value: "produtos-segmentacao" },
        { title: "Mural de Avisos", icon: Megaphone, value: "avisos" },
        { title: "Integridade de Dados", icon: Database, value: "integridade" },
        { title: "Recuperação de Dados", icon: Wrench, value: "recuperacao" }
      ]
    }] : [{
      label: "Sistema",
      items: [
        { title: "Integridade de Dados", icon: Database, value: "integridade" },
        { title: "Recuperação de Dados", icon: Wrench, value: "recuperacao" }
      ]
    }])
  ]

  // Selecionar menu baseado no tipo de usuário
  let menuGroups: MenuGroup[] = []
  if (profile.tipo_usuario === 'fornecedor') {
    menuGroups = fornecedorMenuGroups
  } else if (profile.tipo_usuario === 'gestor_conta') {
    menuGroups = gestorMenuGroups
  } else if (profile.tipo_usuario === 'sdr') {
    menuGroups = sdrMenuGroups
  } else if (profile.tipo_usuario === 'customer_success') {
    menuGroups = csMenuGroups
  } else if (profile.tipo_usuario === 'gestor_marcenaria') {
    menuGroups = gestorMarcenariaMenuGroups
  } else if (profile.tipo_usuario === 'consultor_marcenaria') {
    menuGroups = consultorMarcenariaMenuGroups
  } else if (profile.tipo_usuario === 'closer') {
    menuGroups = closerMenuGroups
  } else if (profile.tipo_usuario === 'pre_vendas') {
    menuGroups = preVendasMenuGroups
  } else {
    menuGroups = adminMenuGroups
  }

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarHeader className="p-0">
        <div style={{
          padding: collapsed ? '14px 0' : '16px 20px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid #E5E7EB',
          marginBottom: 4,
        }}>
          {collapsed ? (
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg, #2D3395 0%, #534AB7 100%)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 13,
              flexShrink: 0,
            }}>R</div>
          ) : (
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: '#1A2030', letterSpacing: '-0.3px', lineHeight: 1 }}>
              Reforma<span style={{ color: '#2D3395' }}>100</span>
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* Notificações para Fornecedores e Concierges */}
        {['fornecedor', 'gestor_conta', 'customer_success'].includes(profile.tipo_usuario) && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <NotificationCenter>
                    <SidebarMenuButton className="hover:bg-muted/50">
                      <Bell className="h-4 w-4" />
                      {!collapsed && <span>Notificações</span>}
                    </SidebarMenuButton>
                  </NotificationCenter>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-xs font-bold tracking-widest uppercase text-muted-foreground/60 px-2 mb-0.5">{!collapsed && group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      onClick={() => onViewChange(item.value)}
                      className={`relative transition-all ${
                        activeView === item.value
                          ? "bg-primary/10 text-primary font-semibold"
                          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      }`}
                      style={activeView === item.value ? { borderLeft: '2px solid #2D3395', paddingLeft: '12px' } : { borderLeft: '2px solid transparent', paddingLeft: '12px' }}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && (
                        <>
                          <span>{item.title}</span>
                          {item.badge && (
                            <span className="absolute right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                      {collapsed && item.badge && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}