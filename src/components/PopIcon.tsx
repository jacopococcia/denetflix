import {
  Ban,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Coffee,
  Compass,
  Disc,
  Eye,
  Film,
  Flame,
  Gem,
  Ghost,
  Globe,
  Heart,
  Home,
  Moon,
  Music,
  Popcorn,
  Rewind,
  Rocket,
  Search,
  ShieldAlert,
  Siren,
  Skull,
  Smile,
  Sparkles,
  Star,
  Sun,
  Ticket,
  Timer,
  Tv,
  User,
  Users,
  Video,
  Wand2,
  Wine,
  Zap,
} from 'lucide-react';
import type {PopIconName, WarholPopAccent} from '../types/quiz';

interface PopIconProps {
  name: PopIconName;
  accent?: WarholPopAccent;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Warhol & Lichtenstein screenprint palette:
 * Bold black comic-ink border, high-saturation primaries/neons, hard ink shadow.
 */
const ACCENT_STYLES: Record<WarholPopAccent, string> = {
  'warhol-pink': 'bg-[#FF1E8A] text-white border-black shadow-[3px_3px_0px_#000000]',
  'lichtenstein-blue': 'bg-[#0047FF] text-white border-black shadow-[3px_3px_0px_#000000]',
  'pop-yellow': 'bg-[#FFE600] text-black border-black shadow-[3px_3px_0px_#000000]',
  'cyan-pop': 'bg-[#00E5FF] text-black border-black shadow-[3px_3px_0px_#000000]',
  'acid-lime': 'bg-[#B8FF00] text-black border-black shadow-[3px_3px_0px_#000000]',
  'crimson-pop': 'bg-[#E80000] text-white border-black shadow-[3px_3px_0px_#000000]',
  'tangerine-pop': 'bg-[#FF5C00] text-white border-black shadow-[3px_3px_0px_#000000]',
};

const SIZE_STYLES: Record<NonNullable<PopIconProps['size']>, {box: string; icon: string}> = {
  sm: {box: 'h-9 w-9 rounded-lg sm:h-10 sm:w-10', icon: 'h-4 w-4 sm:h-5 sm:w-5'},
  md: {box: 'h-10 w-10 rounded-xl sm:h-11 sm:w-11', icon: 'h-5 w-5'},
  lg: {box: 'h-11 w-11 rounded-xl sm:h-13 sm:w-13', icon: 'h-5 w-5 sm:h-6 sm:w-6'},
};

export function PopIcon({name, accent = 'crimson-pop', size = 'md'}: PopIconProps) {
  const {box, icon} = SIZE_STYLES[size];

  const renderIcon = () => {
    switch (name) {
      case 'calendar':
        return <Calendar className={icon} strokeWidth={2.5} />;
      case 'disc':
        return <Disc className={icon} strokeWidth={2.5} />;
      case 'film':
        return <Film className={icon} strokeWidth={2.5} />;
      case 'cassette':
        return <Video className={icon} strokeWidth={2.5} />;
      case 'tv':
        return <Tv className={icon} strokeWidth={2.5} />;
      case 'sparkles':
        return <Sparkles className={icon} strokeWidth={2.5} />;
      case 'flame':
        return <Flame className={icon} strokeWidth={2.5} />;
      case 'smile':
        return <Smile className={icon} strokeWidth={2.5} />;
      case 'rocket':
        return <Rocket className={icon} strokeWidth={2.5} />;
      case 'wand':
        return <Wand2 className={icon} strokeWidth={2.5} />;
      case 'skull':
        return <Skull className={icon} strokeWidth={2.5} />;
      case 'eye':
        return <Eye className={icon} strokeWidth={2.5} />;
      case 'heart':
        return <Heart className={icon} strokeWidth={2.5} />;
      case 'compass':
        return <Compass className={icon} strokeWidth={2.5} />;
      case 'siren':
        return <Siren className={icon} strokeWidth={2.5} />;
      case 'home':
        return <Home className={icon} strokeWidth={2.5} />;
      case 'music':
        return <Music className={icon} strokeWidth={2.5} />;
      case 'shield':
        return <ShieldAlert className={icon} strokeWidth={2.5} />;
      case 'search':
        return <Search className={icon} strokeWidth={2.5} />;
      case 'sun':
        return <Sun className={icon} strokeWidth={2.5} />;
      case 'zap':
      case 'bolt':
        return <Zap className={icon} strokeWidth={2.5} />;
      case 'rewind':
        return <Rewind className={icon} strokeWidth={2.5} />;
      case 'ghost':
        return <Ghost className={icon} strokeWidth={2.5} />;
      case 'moon':
        return <Moon className={icon} strokeWidth={2.5} />;
      case 'star':
        return <Star className={icon} strokeWidth={2.5} />;
      case 'coffee':
        return <Coffee className={icon} strokeWidth={2.5} />;
      case 'brain':
        return <Brain className={icon} strokeWidth={2.5} />;
      case 'clock':
        return <Clock className={icon} strokeWidth={2.5} />;
      case 'timer':
        return <Timer className={icon} strokeWidth={2.5} />;
      case 'gem':
        return <Gem className={icon} strokeWidth={2.5} />;
      case 'globe':
        return <Globe className={icon} strokeWidth={2.5} />;
      case 'ticket':
        return <Ticket className={icon} strokeWidth={2.5} />;
      case 'user':
        return <User className={icon} strokeWidth={2.5} />;
      case 'users':
        return <Users className={icon} strokeWidth={2.5} />;
      case 'wine':
        return <Wine className={icon} strokeWidth={2.5} />;
      case 'popcorn':
        return <Popcorn className={icon} strokeWidth={2.5} />;
      case 'ban':
        return <Ban className={icon} strokeWidth={2.5} />;
      case 'check-circle':
        return <CheckCircle2 className={icon} strokeWidth={2.5} />;
    }
  };

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden border-2 transition-transform duration-150 ease-out group-hover:scale-105 group-hover:-rotate-3 ${box} ${ACCENT_STYLES[accent]}`}
    >
      <span className="pop-halftone pointer-events-none absolute inset-0 opacity-35" />
      <span className="relative z-10 flex items-center justify-center">{renderIcon()}</span>
    </span>
  );
}
