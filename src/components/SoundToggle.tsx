import {Volume2, VolumeX} from 'lucide-react';
import {useSyncExternalStore} from 'react';
import {
  isSoundEnabled,
  subscribeSoundPreference,
  toggleSoundEnabled,
} from '../utils/soundEffects';

interface SoundToggleProps {
  className?: string;
}

export function SoundToggle({className = ''}: SoundToggleProps) {
  const enabled = useSyncExternalStore(
    subscribeSoundPreference,
    isSoundEnabled,
    () => true,
  );

  return (
    <button
      type="button"
      onClick={() => toggleSoundEnabled()}
      aria-pressed={enabled}
      aria-label={enabled ? 'Mute retro sound effects' : 'Enable retro sound effects'}
      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E80000] ${
        enabled
          ? 'text-[#F6F4EE] hover:bg-white/8'
          : 'text-[#A8B1C7] hover:bg-white/8 hover:text-[#F6F4EE]'
      } ${className}`}
    >
      {enabled ? (
        <Volume2 className="h-4 w-4 text-[#00D4FF]" aria-hidden="true" />
      ) : (
        <VolumeX className="h-4 w-4 text-[#A8B1C7]" aria-hidden="true" />
      )}
      <span>{enabled ? 'Sound: On' : 'Sound: Off'}</span>
    </button>
  );
}
