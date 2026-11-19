import {ArrowLeft, ArrowRight, RotateCcw, Sparkles} from 'lucide-react';
import {useState} from 'react';
import {Button} from '../components/Button';
import {PopIcon} from '../components/PopIcon';
import {ProgressBar} from '../components/ProgressBar';
import {QuizOption} from '../components/QuizOption';
import {SoundToggle} from '../components/SoundToggle';
import {QUIZ_QUESTIONS} from '../data/quizQuestions';
import type {
  AttentionPreference,
  DecadePreference,
  ExclusionPreference,
  MoodPreference,
  MovieGenre,
  MovieOrigin,
  PopularityPreference,
  QuizAnswersMap,
  ViewingContext,
} from '../types/quiz';
import {playPopSelect, playStepTransition} from '../utils/soundEffects';

interface QuizPageProps {
  currentStepIndex: number;
  answers: QuizAnswersMap;
  onUpdateAnswers: (next: QuizAnswersMap) => void;
  onStepChange: (nextIndex: number) => void;
  onRestart: () => void;
  onSubmit: () => void;
}

export function QuizPage({
  currentStepIndex,
  answers,
  onUpdateAnswers,
  onStepChange,
  onRestart,
  onSubmit,
}: QuizPageProps) {
  const [slideDirection, setSlideDirection] = useState<'next' | 'back'>('next');
  const question = QUIZ_QUESTIONS[currentStepIndex];
  const totalSteps = QUIZ_QUESTIONS.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  const isOptionSelected = (value: string): boolean => {
    switch (question.id) {
      case 'decade':
        return answers.decade === value;
      case 'genres':
        return answers.genres.includes(value as MovieGenre);
      case 'origin':
        return answers.origin === value;
      case 'mood':
        return answers.mood === value;
      case 'attention':
        return answers.attention === value;
      case 'popularity':
        return answers.popularity === value;
      case 'context':
        return answers.context === value;
      case 'exclusions':
        return answers.exclusions.includes(value as ExclusionPreference);
    }
  };

  const handleSelectOption = (value: string) => {
    const currentlySelected = isOptionSelected(value);
    switch (question.id) {
      case 'decade':
        playPopSelect(true);
        onUpdateAnswers({...answers, decade: value as DecadePreference});
        break;
      case 'genres': {
        const genre = value as MovieGenre;
        const exists = answers.genres.includes(genre);
        playPopSelect(!exists);
        if (exists) {
          onUpdateAnswers({...answers, genres: answers.genres.filter((g) => g !== genre)});
        } else {
          const max = question.maxSelections ?? 3;
          const next = [...answers.genres, genre].slice(-max);
          onUpdateAnswers({...answers, genres: next});
        }
        break;
      }
      case 'origin':
        playPopSelect(true);
        onUpdateAnswers({...answers, origin: value as MovieOrigin});
        break;
      case 'mood':
        playPopSelect(true);
        onUpdateAnswers({...answers, mood: value as MoodPreference});
        break;
      case 'attention':
        playPopSelect(true);
        onUpdateAnswers({...answers, attention: value as AttentionPreference});
        break;
      case 'popularity':
        playPopSelect(true);
        onUpdateAnswers({...answers, popularity: value as PopularityPreference});
        break;
      case 'context':
        playPopSelect(true);
        onUpdateAnswers({...answers, context: value as ViewingContext});
        break;
      case 'exclusions': {
        const exclusion = value as ExclusionPreference;
        if (exclusion === 'no-preference') {
          playPopSelect(!currentlySelected);
          onUpdateAnswers({...answers, exclusions: ['no-preference']});
          break;
        }
        const withoutNone = answers.exclusions.filter((ex) => ex !== 'no-preference');
        const exists = withoutNone.includes(exclusion);
        playPopSelect(!exists);
        const next = exists
          ? withoutNone.filter((ex) => ex !== exclusion)
          : [...withoutNone, exclusion];
        onUpdateAnswers({
          ...answers,
          exclusions: next.length > 0 ? next : ['no-preference'],
        });
        break;
      }
    }
  };

  const goToStep = (nextIndex: number, direction: 'next' | 'back') => {
    setSlideDirection(direction);
    playStepTransition(direction);
    onStepChange(nextIndex);
  };

  const handleSurpriseGenres = () => {
    onUpdateAnswers({...answers, genres: []});
    goToStep(currentStepIndex + 1, 'next');
  };

  const handleNext = () => {
    if (isLastStep) {
      onSubmit();
    } else {
      goToStep(currentStepIndex + 1, 'next');
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      goToStep(currentStepIndex - 1, 'back');
    }
  };

  const isMultiColumn = question.options.length > 6;

  return (
    <section className="animate-view-enter mx-auto max-w-3xl px-4 py-5 pb-24 sm:px-6 sm:py-10 sm:pb-12">
      <div className="space-y-5 sm:space-y-6">
        {/* Progress & Utility row */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          <div className="flex-1">
            <ProgressBar currentStep={currentStepIndex + 1} totalSteps={totalSteps} />
          </div>
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <SoundToggle />
            <button
              type="button"
              onClick={() => {
                playStepTransition('back');
                onRestart();
              }}
              className="inline-flex min-h-[44px] items-center gap-1.5 px-2 text-xs font-medium text-[#A8B1C7] hover:text-[#F6F4EE] cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Restart quiz</span>
            </button>
          </div>
        </div>

        {/* Directional slide container keyed by step index */}
        <div
          key={question.id}
          className={`space-y-5 sm:space-y-6 ${
            slideDirection === 'next' ? 'animate-slide-next' : 'animate-slide-prev'
          }`}
        >
          {/* Question Header with Warhol/Lichtenstein Pop Icon */}
          <div className="flex items-start gap-3 pt-1 sm:gap-4 sm:pt-2">
            <PopIcon
              name={question.icon}
              accent={question.accentColor || 'crimson-pop'}
              size="lg"
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <h1 className="break-words font-display text-xl font-extrabold leading-tight text-[#F6F4EE] sm:text-3xl">
                {question.prompt}
              </h1>
              <p className="text-sm text-[#A8B1C7] sm:text-base">{question.helperText}</p>
              {question.id === 'genres' ? (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <p className="text-xs font-semibold text-[#00E5FF] tabular-nums">
                    Selected: {answers.genres.length} / {question.maxSelections ?? 3}
                    {answers.genres.length === 0 ? ' (any genre works)' : ''}
                  </p>
                  <button
                    type="button"
                    onClick={handleSurpriseGenres}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/12 bg-[#141724] px-2.5 text-xs font-semibold text-[#FFE600] active:scale-[0.98] sm:hidden"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Surprise me</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Answer Options */}
          <div
            role={question.selectionMode === 'single' ? 'radiogroup' : 'group'}
            aria-label={question.prompt}
            className={`grid gap-3 ${isMultiColumn ? 'sm:grid-cols-2' : 'grid-cols-1'}`}
          >
            {question.options.map((option) => (
              <QuizOption
                key={option.value}
                label={option.label}
                hint={option.hint}
                icon={option.icon}
                accentColor={option.accentColor}
                selected={isOptionSelected(option.value)}
                selectionMode={question.selectionMode}
                onSelect={() => handleSelectOption(option.value)}
              />
            ))}
          </div>
        </div>

        {/* Desktop navigation bar */}
        <div className="hidden items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex">
          <Button
            variant="secondary"
            onClick={handleBack}
            disabled={isFirstStep}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back</span>
          </Button>

          <div className="flex items-center gap-3">
            {question.id === 'genres' ? (
              <Button variant="ghost" onClick={handleSurpriseGenres}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>Surprise me</span>
              </Button>
            ) : null}

            <Button variant="primary" onClick={handleNext}>
              <span>{isLastStep ? 'Find my movie' : 'Continue'}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile thumb-zone bottom bar (compact + iOS safe-area aware) */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-[#0B0D14]/95 px-3.5 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={handleBack}
            disabled={isFirstStep}
            className="flex-1 px-3.5"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back</span>
          </Button>

          <Button variant="primary" onClick={handleNext} className="flex-[2] px-4">
            <span>{isLastStep ? 'Find my movie' : 'Continue'}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}
