import {Check} from 'lucide-react';
import type {PopIconName, WarholPopAccent} from '../types/quiz';
import {PopIcon} from './PopIcon';

interface QuizOptionProps {
  label: string;
  hint?: string;
  icon: PopIconName;
  accentColor?: WarholPopAccent;
  selected: boolean;
  selectionMode: 'single' | 'multiple';
  onSelect: () => void;
}

export function QuizOption({
  label,
  hint,
  icon,
  accentColor = 'crimson-pop',
  selected,
  selectionMode,
  onSelect,
}: QuizOptionProps) {
  return (
    <button
      type="button"
      role={selectionMode === 'single' ? 'radio' : 'checkbox'}
      aria-checked={selected}
      onClick={onSelect}
      className={`group flex min-h-[58px] w-full items-center justify-between gap-3.5 rounded-xl border px-4 py-3 text-left transition-[background-color,border-color,transform] duration-150 ease-out cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E80000] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] ${
        selected
          ? 'border-[#E80000] bg-[#E80000]/16 text-[#F6F4EE]'
          : 'border-white/10 bg-[#141724] text-[#F6F4EE] hover:border-white/25 hover:bg-[#1B2033]'
      }`}
    >
      <PopIcon name={icon} accent={accentColor} size="sm" />

      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold leading-snug text-[#F6F4EE]">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-sm leading-snug text-[#A8B1C7]">{hint}</span>
        ) : null}
      </span>

      <span
        aria-hidden="true"
        className={`flex h-6 w-6 shrink-0 items-center justify-center transition-colors duration-150 ${
          selectionMode === 'single' ? 'rounded-full' : 'rounded-md'
        } ${
          selected
            ? 'animate-pop-check bg-[#E80000] text-white'
            : 'border border-white/25 bg-[#0B0D14]/60 text-transparent group-hover:border-white/45'
        }`}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    </button>
  );
}
