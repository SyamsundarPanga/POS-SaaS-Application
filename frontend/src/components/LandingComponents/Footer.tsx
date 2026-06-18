import React from 'react';
import { Building2, Mail, Phone } from 'lucide-react';

interface FooterProps {
  onScrollToSection?: (id: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onScrollToSection }) => {
  const currentYear = new Date().getFullYear();

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    if (id.startsWith('#') && onScrollToSection) {
      e.preventDefault();
      onScrollToSection(id.replace('#', ''));
    }
  };

  return (
    <footer className="bg-white text-gray-600 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-8 h-8 text-emerald-600" />
              <h3 className="text-2xl font-black text-gray-900">PayPoint</h3>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Enterprise POS solution for modern retailers managing multi-location operations with real-time synchronization and advanced analytics.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-gray-900 font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#inventory" onClick={(e) => handleLinkClick(e, '#inventory')} className="hover:text-emerald-600 transition-colors">Features</a></li>
              <li><a href="#pricing" onClick={(e) => handleLinkClick(e, '#pricing')} className="hover:text-emerald-600 transition-colors">Pricing</a></li>
              <li><a href="#solutions" onClick={(e) => handleLinkClick(e, '#solutions')} className="hover:text-emerald-600 transition-colors">Solutions</a></li>
              <li><a href="#MultiTenant" onClick={(e) => handleLinkClick(e, '#MultiTenant')} className="hover:text-emerald-600 transition-colors">Security</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-gray-900 font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" onClick={(e) => handleLinkClick(e, '#')} className="hover:text-emerald-600 transition-colors">About Us</a></li>
              <li><a href="#" onClick={(e) => handleLinkClick(e, '#')} className="hover:text-emerald-600 transition-colors">Blog</a></li>
              <li><a href="#" onClick={(e) => handleLinkClick(e, '#')} className="hover:text-emerald-600 transition-colors">Careers</a></li>
              <li><a href="#contact" onClick={(e) => handleLinkClick(e, '#contact')} className="hover:text-emerald-600 transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-gray-900 font-bold mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-600" />
                <a href="mailto:support@paypoint.com" className="hover:text-emerald-600 transition-colors">support@paypoint.com</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" />
                <a href="tel:+1234567890" className="hover:text-emerald-600 transition-colors">+1 (234) 567-890</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © {currentYear} PayPoint. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="/privacy" className="text-gray-500 hover:text-emerald-600 transition-colors">Privacy Policy</a>
              <a href="/terms" className="text-gray-500 hover:text-emerald-600 transition-colors">Terms of Service</a>
              <a href="/cookies" className="text-gray-500 hover:text-emerald-600 transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;