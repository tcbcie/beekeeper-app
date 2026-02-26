import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  Bot,
  Bug,
  CheckCircle,
  ClipboardList,
  Crown,
  Egg,
  MapPin,
  Microscope,
  Smartphone,
  Star,
  Users,
} from 'lucide-react'

export type IconConcept =
  | 'apiary'
  | 'hive'
  | 'inspection'
  | 'queen'
  | 'task'
  | 'team'
  | 'rearingGroup'
  | 'varroa'
  | 'varroaMonitoring'
  | 'aiAssistant'
  | 'knowledge'
  | 'mobile'
  | 'highlight'

export const iconography: Record<IconConcept, LucideIcon> = {
  apiary: MapPin,
  hive: Bug,
  inspection: ClipboardList,
  queen: Crown,
  task: CheckCircle,
  team: Users,
  rearingGroup: Egg,
  varroa: Bug,
  varroaMonitoring: Microscope,
  aiAssistant: Bot,
  knowledge: BookOpen,
  mobile: Smartphone,
  highlight: Star,
}

export const dashboardCardIcons = {
  apiaries: iconography.apiary,
  hives: iconography.hive,
  inspections: iconography.inspection,
  queens: iconography.queen,
  tasks: iconography.task,
  teams: iconography.team,
} as const

export const aboutFeatureIcons = {
  apiaryManagement: iconography.apiary,
  queenTracking: iconography.queen,
  inspectionLogging: iconography.inspection,
  varroaMonitoring: iconography.varroaMonitoring,
  queenRearing: iconography.rearingGroup,
  aiAssistant: iconography.aiAssistant,
  knowledgeBase: iconography.knowledge,
  mobileApp: iconography.mobile,
} as const

