import {
  User,
  LayoutDashboard,
  Users,
  MessageSquare,
  CalendarDays,
  Map,
  Star,
  Package,
  FileText,
  Phone,
  ClipboardList,
  Settings,
  LogOut,
  Shield,
  Droplets,
  Briefcase,
  Sparkles,
  Smartphone,
  Eye,
  EyeOff,
  TrendingUp,
  Plus,
  LucideProps,
} from 'lucide-react';

const iconMap = {
  user: User,
  dashboard: LayoutDashboard,
  votantes: Users,
  crm: MessageSquare,
  eventos: CalendarDays,
  mapa: Map,
  lideres: Star,
  apoyos: Package,
  boletines: FileText,
  llamadas: Phone,
  ine: ClipboardList,
  configuracion: Settings,
  salir: LogOut,
  seguridad: Shield,
  agua: Droplets,
  empleo: Briefcase,
  ia: Sparkles,
  app: Smartphone,
  ver: Eye,
  ocultar: EyeOff,
  historico: TrendingUp,
  plus: Plus,
};

export type IconName = keyof typeof iconMap;

interface IconProps extends Omit<LucideProps, 'ref'> {
  name: IconName;
}

export function Icon({ name, size = 20, className, ...rest }: IconProps) {
  const LucideIcon = iconMap[name];
  if (!LucideIcon) return null;
  return <LucideIcon size={size} className={className} {...rest} />;
}

export { iconMap };
