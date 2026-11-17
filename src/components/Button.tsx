import type {ButtonHTMLAttributes, ReactNode} from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[#E80000] text-white font-semibold hover:bg-[#ff1a1a] active:scale-[0.98] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E80000]',
  secondary:
    'bg-[#1D2134] text-[#F6F4EE] border border-white/14 font-medium hover:bg-[#272D45] hover:border-white/25 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E80000]',
  ghost:
    'bg-transparent text-[#A8B1C7] font-medium hover:text-[#F6F4EE] hover:bg-white/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E80000]',
  danger:
    'bg-[#FF5C6C]/15 text-[#FF5C6C] border border-[#FF5C6C]/35 font-medium hover:bg-[#FF5C6C]/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C6C]',
};

export function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm leading-none whitespace-nowrap shrink-0 transition-[background-color,border-color,transform,color] duration-150 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
