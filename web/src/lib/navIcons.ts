import type { ComponentType } from "react";
import {
  Activity,
  BarChart3,
  Clock,
  Code,
  Cpu,
  Database,
  Eye,
  FileText,
  GitBranch,
  Globe,
  Heart,
  KeyRound,
  MessageSquare,
  Package,
  Puzzle,
  Settings,
  Shield,
  Sparkles,
  Star,
  Terminal,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

/** Ícones que os manifests de plugin podem referenciar pelo nome. */
const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  Activity,
  BarChart3,
  Clock,
  Cpu,
  FileText,
  GitBranch,
  KeyRound,
  MessageSquare,
  Package,
  Settings,
  Puzzle,
  Sparkles,
  Terminal,
  Globe,
  Database,
  Shield,
  Users,
  Wrench,
  Zap,
  Heart,
  Star,
  Code,
  Eye,
};

export function resolveIcon(name: string): ComponentType<{ className?: string }> {
  return ICON_MAP[name] ?? Puzzle;
}
