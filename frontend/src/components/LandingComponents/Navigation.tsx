import React from 'react';

interface NavigationProps {
  isScrolled: boolean;
  scrollToSection: (sectionId: string) => void;
  onGetStarted: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ isScrolled, scrollToSection, onGetStarted }) => {
  return (
    <nav
      className={`flex justify-between items-center px-4 md:px-12 fixed top-0 left-0 w-full z-50 transition-all duration-500 bg-white ${isScrolled ? 'py-2' : 'py-4'
        }`}
    >
      <img src="/Paypoint 2.png" alt="Paypoint Logo" className="h-12 w-auto transition-transform duration-300 hover:scale-110" />

      <div className="flex items-center space-x-8">
        {[
          { id: 'solutions', label: 'Solutions' },
          { id: 'MultiTenant', label: 'Features' },
          { id: 'pricing', label: 'Pricing' }
        ].map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => {
              e.preventDefault();
              scrollToSection(item.id);
            }}
            className="hidden md:block text-gray-700 text-sm font-bold hover:text-emerald-500 transition-colors"
          >
            {item.label}
          </a>
        ))}

        <button
          onClick={onGetStarted}
          className="bg-emerald-500 text-black px-7 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 hover:bg-black hover:text-white"
        >
          Get Started
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
