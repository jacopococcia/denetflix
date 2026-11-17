import {AlertTriangle} from 'lucide-react';

interface ErrorBannerProps {
  title?: string;
  message: string;
}

export function ErrorBanner({title = 'Heads up', message}: ErrorBannerProps) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-[#E80000]/35 bg-[#141724] px-4 py-3.5 text-sm text-[#F6F4EE]"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#FF4D4D]" aria-hidden="true" />
      <div className="space-y-0.5">
        <p className="font-semibold text-[#F6F4EE]">{title}</p>
        <p className="text-xs leading-relaxed text-[#A8B1C7]">{message}</p>
      </div>
    </div>
  );
}
