import React from 'react';
import { ChevronUp } from 'lucide-react';

interface ScrollToTopProps {
  isVisible: boolean;
  onClick: () => void;
}

const ScrollToTop: React.FC<ScrollToTopProps> = ({ isVisible, onClick }) => {
  if (!isVisible) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 right-8 bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-40 animate-bounce"
      aria-label="Scroll to top"
    >
      <ChevronUp className="w-6 h-6" />
    </button>
  );
};

export default ScrollToTop;
