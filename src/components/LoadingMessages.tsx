import {useEffect, useState} from 'react';
import {Button} from './Button';
import {DenetflixLogoMark} from './DenetflixLogoMark';

const LOADING_MESSAGES = [
  'Dusting off the VHS tapes...',
  'Asking the movie oracle...',
  'Checking the popcorn supply...',
  'Looking for something better than scrolling...',
  'Consulting the retro movie department...',
];

interface LoadingMessagesProps {
  onCancel: () => void;
}

export function LoadingMessages({onCancel}: LoadingMessagesProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1400);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section
      aria-live="polite"
      aria-busy="true"
      className="animate-view-enter mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center"
    >
      <div className="mb-6 flex items-center justify-center">
        <DenetflixLogoMark size={72} animated />
      </div>

      <h1 className="font-display text-2xl font-bold text-[#F6F4EE] sm:text-3xl">
        Digging up your rare retro lineup
      </h1>

      <p
        key={messageIndex}
        className="animate-view-enter mt-3 min-h-[28px] text-base font-semibold text-[#FF4D4D]"
      >
        {LOADING_MESSAGES[messageIndex]}
      </p>

      <p className="mt-2 max-w-md text-sm text-[#A8B1C7]">
        Matching your answers against rare American, Italian, and international 1960s–1990s gems.
      </p>

      <div className="mt-8">
        <Button variant="ghost" onClick={onCancel}>
          Cancel & go back
        </Button>
      </div>
    </section>
  );
}
