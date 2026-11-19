import {useCallback, useEffect, useRef, useState} from 'react';
import {ErrorBanner} from './components/ErrorBanner';
import {Footer} from './components/Footer';
import {Header} from './components/Header';
import {LegalModal} from './components/LegalModal';
import {LoadingMessages} from './components/LoadingMessages';
import {RetroBackdrop} from './components/RetroBackdrop';
import {DEFAULT_QUIZ_ANSWERS, QUIZ_QUESTIONS} from './data/quizQuestions';
import {HomePage} from './pages/HomePage';
import {QuizPage} from './pages/QuizPage';
import {ResultsPage} from './pages/ResultsPage';
import {generateRecommendations} from './services/recommendationService';
import type {RecommendationBundle} from './types/movie';
import type {QuizAnswersMap} from './types/quiz';
import {getDefaultCountryCode} from './utils/formatters';
import {syncPageSeo} from './utils/seo';
import {playReelSpin, playResultsReady} from './utils/soundEffects';

type ActiveView = 'home' | 'quiz' | 'loading' | 'results';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswersMap>(DEFAULT_QUIZ_ANSWERS);
  const [countryCode, setCountryCode] = useState<string>(() => getDefaultCountryCode());
  const [bundle, setBundle] = useState<RecommendationBundle | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [legalTopic, setLegalTopic] = useState<'privacy' | 'terms' | null>(null);

  const activeRequestRef = useRef<AbortController | null>(null);

  const cancelInFlightRequest = useCallback(() => {
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
      activeRequestRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cancelInFlightRequest();
  }, [cancelInFlightRequest]);

  useEffect(() => {
    syncPageSeo({
      activeView,
      currentStepIndex,
      totalSteps: QUIZ_QUESTIONS.length,
      answers,
      bundle,
    });
  }, [activeView, currentStepIndex, answers, bundle]);

  const runRecommendationSearch = useCallback(
    async (quizAnswers: QuizAnswersMap, targetCountry: string, shuffleSeed?: number) => {
      cancelInFlightRequest();
      const controller = new AbortController();
      activeRequestRef.current = controller;

      setErrorMessage(null);
      playReelSpin();
      setActiveView('loading');

      const startedAt = Date.now();
      // Hard upper bound guard so UI never hangs in loading loop even if network stalls
      const safetyTimer = window.setTimeout(() => {
        if (activeRequestRef.current === controller) {
          controller.abort();
        }
      }, 15000);

      try {
        const result = await generateRecommendations(
          quizAnswers,
          targetCountry,
          controller.signal,
          typeof shuffleSeed === 'number' ? {shuffleSeed} : undefined,
        );

        const elapsed = Date.now() - startedAt;
        if (elapsed < 700) {
          await new Promise<void>((resolve, reject) => {
            const timeout = window.setTimeout(resolve, 700 - elapsed);
            controller.signal.addEventListener(
              'abort',
              () => {
                window.clearTimeout(timeout);
                reject(new DOMException('Aborted', 'AbortError'));
              },
              {once: true},
            );
          });
        }

        if (controller.signal.aborted) return;

        setBundle(result);
        playResultsReady(result.recommendations.length > 0);
        setActiveView('results');
        window.scrollTo({top: 0, behavior: 'smooth'});
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') {
          // Only surface timeout fallback if user didn't intentionally cancel
          if (activeRequestRef.current === controller) {
            setErrorMessage(
              'That lookup took longer than expected. Please try once more!',
            );
            setActiveView('quiz');
          }
          return;
        }
        if (import.meta.env.DEV) {
          console.error('[Denetflix] Recommendation error:', error);
        }
        setErrorMessage(
          'Looks like the movie gremlins are busy. We could not complete that lookup right now—please try again.',
        );
        setActiveView('quiz');
      } finally {
        window.clearTimeout(safetyTimer);
        if (activeRequestRef.current === controller) {
          activeRequestRef.current = null;
        }
      }
    },
    [cancelInFlightRequest],
  );

  const handleStartQuiz = () => {
    cancelInFlightRequest();
    setAnswers(DEFAULT_QUIZ_ANSWERS);
    setCurrentStepIndex(0);
    setErrorMessage(null);
    setActiveView('quiz');
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleGoHome = () => {
    cancelInFlightRequest();
    setErrorMessage(null);
    setActiveView('home');
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleNavigateSection = (sectionId: string) => {
    if (activeView !== 'home') {
      cancelInFlightRequest();
      setActiveView('home');
      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({behavior: 'smooth'});
      }, 60);
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView({behavior: 'smooth'});
  };

  const handleModifyAnswers = () => {
    cancelInFlightRequest();
    setCurrentStepIndex(0);
    setActiveView('quiz');
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleCountryChangeFromResults = (newCountry: string) => {
    setCountryCode(newCountry);
    void runRecommendationSearch(answers, newCountry);
  };

  const handleShuffleLineup = () => {
    const nextSeed = Math.floor(Math.random() * 100000) + 1;
    void runRecommendationSearch(answers, countryCode, nextSeed);
  };

  return (
    <div className="film-grain relative flex min-h-dvh flex-col bg-[#0B0D14] text-[#F6F4EE]">
      <RetroBackdrop />

      <Header
        activeView={activeView}
        onStartQuiz={handleStartQuiz}
        onGoHome={handleGoHome}
        onNavigateSection={handleNavigateSection}
      />

      <main className="relative z-10 flex-1">
        {errorMessage ? (
          <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
            <ErrorBanner title="Could not load lineup" message={errorMessage} />
          </div>
        ) : null}

        {activeView === 'home' ? (
          <HomePage
            countryCode={countryCode}
            onChangeCountry={setCountryCode}
            onStartQuiz={handleStartQuiz}
          />
        ) : null}

        {activeView === 'quiz' ? (
          <QuizPage
            currentStepIndex={currentStepIndex}
            answers={answers}
            onUpdateAnswers={setAnswers}
            onStepChange={setCurrentStepIndex}
            onRestart={handleStartQuiz}
            onSubmit={() => void runRecommendationSearch(answers, countryCode)}
          />
        ) : null}

        {activeView === 'loading' ? (
          <LoadingMessages
            onCancel={() => {
              cancelInFlightRequest();
              setActiveView('quiz');
            }}
          />
        ) : null}

        {activeView === 'results' && bundle ? (
          <ResultsPage
            bundle={bundle}
            countryCode={countryCode}
            onChangeCountry={handleCountryChangeFromResults}
            onShuffleLineup={handleShuffleLineup}
            onModifyAnswers={handleModifyAnswers}
            onStartOver={handleStartQuiz}
          />
        ) : null}
      </main>

      <div className="relative z-10">
        <Footer onOpenLegalModal={setLegalTopic} />
      </div>
      <LegalModal topic={legalTopic} onClose={() => setLegalTopic(null)} />
    </div>
  );
}
