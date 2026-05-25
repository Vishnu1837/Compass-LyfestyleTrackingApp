import {
  Activity,
  Droplet,
  Dumbbell,
  Footprints,
  Heart,
  LayoutDashboard,
  Moon,
  Pill,
  Sparkles,
  Trophy,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Phase the module ships in — used to gate not-yet-built sections. */
  ready: boolean;
};

export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, ready: true },
  { title: "Strength", href: "/strength", icon: Dumbbell, ready: true },
  { title: "Cardio", href: "/cardio", icon: Heart, ready: true },
  { title: "Steps", href: "/steps", icon: Footprints, ready: true },
  { title: "Nutrition", href: "/nutrition", icon: UtensilsCrossed, ready: true },
  { title: "Sleep", href: "/sleep", icon: Moon, ready: true },
  { title: "Supplements", href: "/supplements", icon: Pill, ready: true },
  { title: "Water", href: "/water", icon: Droplet, ready: true },
  { title: "Body", href: "/body", icon: Activity, ready: false },
  { title: "AI Coach", href: "/coach", icon: Sparkles, ready: true },
  { title: "Accountability", href: "/accountability", icon: Trophy, ready: true },
];
