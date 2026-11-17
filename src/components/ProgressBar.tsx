interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({currentStep, totalSteps}: ProgressBarProps) {
  const clampedStep = Math.max(1, Math.min(totalSteps, currentStep));
  const percentage = Math.round((clampedStep / totalSteps) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm font-medium">
        <span className="text-[#F6F4EE] tabular-nums">
          Question {clampedStep} of {totalSteps}
        </span>
        <span className="text-[#A8B1C7] tabular-nums">{percentage}% complete</span>
      </div>
      <div
        role="progressbar"
        aria-label="Quiz progress"
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-valuenow={clampedStep}
        className="h-2.5 w-full overflow-hidden rounded-full bg-[#1D2134]"
      >
        <div
          className="h-full rounded-full bg-[#E80000] transition-transform duration-200 ease-out origin-left"
          style={{transform: `scaleX(${clampedStep / totalSteps})`}}
        />
      </div>
    </div>
  );
}
