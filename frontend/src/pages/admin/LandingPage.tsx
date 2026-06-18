import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../../components/LandingComponents/Navigation';
import Hero from '../../components/LandingComponents/Hero';
import Solutions from '../../components/LandingComponents/Solutions';
import MultiTenant from '../../components/LandingComponents/MultiTenant';
import Inventory from '../../components/LandingComponents/Inventory';
import Payment from '../../components/LandingComponents/Payment';
import Analytics from '../../components/LandingComponents/Analytics';
import Loyalty from '../../components/LandingComponents/Loyalty';
import Pricing from '../../components/LandingComponents/Pricing';
import CTASection from '../../components/LandingComponents/CTASection';
import Footer from '../../components/LandingComponents/Footer';
import ScrollToTop from '../../components/LandingComponents/ScrollToTop';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleGetStarted = () => navigate('/login');

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 20);
      setShowScrollTop(currentScrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      window.scrollTo({
        behavior: 'smooth',
        top: element.offsetTop - 80,
      });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      behavior: 'smooth',
      top: 0,
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900 text-black">
      {/* Fixed Navigation bar at top level */}
      <Navigation
        isScrolled={isScrolled}
        scrollToSection={scrollToSection}
        onGetStarted={handleGetStarted}
      />

      {/* Hero & Navigation Master Section */}
      <section className="relative bg-white overflow-hidden">
        {/* Shared Background Image */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-80"
          style={{ backgroundImage: 'url("/Hero5.png")' }}
        ></div>

        {/* Seamless Gradients for Light Theme */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/10 via-transparent to-white"></div>
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-white/20 via-transparent to-white/20"></div>

        <div className="relative z-10 flex flex-col min-h-[60vh]">
          {/* Hero Component */}
          <Hero onGetStarted={handleGetStarted} />
        </div>
      </section>

      {/* Solutions Component */}
      <Solutions />

      {/* MultiTenant Component */}
      <MultiTenant />

      {/* Inventory Component */}
      <Inventory />

      {/* Payment Component */}
      <Payment />

      {/* Analytics Component */}
      <Analytics />

      {/* Loyalty Component */}
      <Loyalty />

      {/* Pricing Component */}
      <Pricing onGetStarted={handleGetStarted} />

      {/* CTA Component */}
      <CTASection onGetStarted={handleGetStarted} />

      {/* Footer Component */}
      <Footer onScrollToSection={scrollToSection} />

      {/* ScrollToTop Component */}
      <ScrollToTop isVisible={showScrollTop} onClick={scrollToTop} />
    </div>
  );
};

export default LandingPage;