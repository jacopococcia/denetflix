import {Button} from './Button';
import {DenetflixLogoMark} from './DenetflixLogoMark';

interface HeaderProps {
  activeView: 'home' | 'quiz' | 'loading' | 'results';
  onStartQuiz: () => void;
  onGoHome: () => void;
  onNavigateSection: (sectionId: string) => void;
}

export function Header({activeView, onStartQuiz, onGoHome, onNavigateSection}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-[#0B0D14]/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3 sm:px-6">
        {/* Zone 1: Single-line Brand Wordmark + Pop Art Logo */}
        <button
          type="button"
          onClick={onGoHome}
          className="inline-flex min-h-[44px] items-center gap-2.5 text-left font-display text-xl font-extrabold tracking-tight text-[#F6F4EE] whitespace-nowrap shrink-0 cursor-pointer hover:text-[#FFE600] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E80000] rounded-lg"
          aria-label="Denetflix home — real rare & cult genre cinema"
        >
          <DenetflixLogoMark size={36} />
          <span>Denetflix</span>
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6 text-sm font-medium text-[#A8B1C7]">
          <a
            href="#how-it-works"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('how-it-works');
            }}
            className="hover:text-[#F6F4EE] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            How it works
          </a>
          <a
            href="#data-sources"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('data-sources');
            }}
            className="hover:text-[#F6F4EE] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Data & availability
          </a>
          <a
            href="#privacy-disclosure"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('privacy-disclosure');
            }}
            className="hover:text-[#F6F4EE] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Privacy
          </a>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          {activeView === 'home' ? (
            <Button variant="primary" onClick={onStartQuiz}>
              Find my movie
            </Button>
          ) : (
            <Button variant="secondary" onClick={onStartQuiz}>
              Start over
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
