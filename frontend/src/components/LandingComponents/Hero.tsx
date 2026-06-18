import React from 'react';

interface HeroProps {
  onGetStarted: () => void;
}

const Hero: React.FC<HeroProps> = ({ onGetStarted }) => {
  return (
    <main className="flex-grow flex items-center pt-24 pb-8 relative z-10 min-h-[45vh]">
      <div className="max-w-7xl mx-auto px-8 md:px-16 text-left animate-fade-in w-full">
        <div className="space-y-6 max-w-3xl">
          <h1 className="text-7xl md:text-9xl font-black text-gray-900 leading-[0.8] tracking-tighter opacity-0 animate-[fade-in-up_0.8s_ease-out_forwards]">
            Pay
            <br />
            <span className="text-emerald-500">Point.</span>
          </h1>

          <p className="text-xl text-gray-600 leading-relaxed font-medium opacity-0 animate-[fade-in-up_0.8s_ease-out_0.2s_forwards]">
            Enterprise POS with multi-tenancy, payments,<br />
            and subscription billing built for serious retail growth.
          </p>

          <div className="flex flex-col sm:flex-row justify-start gap-0 pt-2 opacity-0 animate-[fade-in-up_0.8s_ease-out_0.4s_forwards]">
            <button
              onClick={onGetStarted}
              className="bg-emerald-500 text-black px-8 py-5 rounded-2xl font-bold text-lg"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Hero;
