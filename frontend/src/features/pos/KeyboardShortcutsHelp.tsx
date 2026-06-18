import React from 'react';
import { Keyboard, X } from 'lucide-react';
import EnhancedModal from '../../components/ui/EnhancedModal';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  key: string;
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  { key: 'F1', description: 'Focus product search', category: 'Navigation' },
  { key: 'F2', description: 'Add/Select customer', category: 'Navigation' },
  { key: 'F3', description: 'Open checkout', category: 'Navigation' },
  { key: 'ESC', description: 'Clear cart (with confirmation)', category: 'Actions' },
  { key: 'Ctrl + ?', description: 'Show keyboard shortcuts', category: 'Help' },
  { key: 'Ctrl + P', description: 'Print last receipt', category: 'Actions' },
  { key: 'Ctrl + R', description: 'Process refund', category: 'Actions' },
  { key: 'Ctrl + V', description: 'Void transaction', category: 'Actions' },
  { key: 'Enter', description: 'Submit barcode scan', category: 'Scanning' },
  { key: '↑ ↓', description: 'Navigate product search results', category: 'Navigation' },
];

const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      size="small"
      hideHeaderBorder={true}
      hideScrollbar={true}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-2">
          <div className="p-3 bg-emerald-100 rounded-xl">
            <Keyboard className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="font-medium text-slate-900">
              Speed up your workflow with keyboard shortcuts
            </div>
            <div className="text-sm text-slate-600">
              Press Ctrl + ? anytime to view this help
            </div>
          </div>
        </div>

        {/* Shortcuts by Category */}
        {categories.map((category) => (
          <div key={category}>
            <div className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
              {category}
            </div>
            <div className="space-y-2">
              {shortcuts
                .filter((s) => s.category === category)
                .map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between py-2 px-1"
                  >
                    <span className="text-slate-700">{shortcut.description}</span>
                    <kbd className="px-3 py-1.5 text-sm font-mono font-bold bg-white border-2 border-slate-300 rounded-lg shadow-sm">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
            </div>
          </div>
        ))}

        {/* Tips */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="font-medium text-slate-900 mb-2">💡 Pro Tips</div>
          <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
            <li>Use barcode scanner for fastest product entry</li>
            <li>Press Tab to navigate between form fields</li>
            <li>ESC key works in most modals to cancel</li>
            <li>Function keys (F1-F3) work from anywhere in the terminal</li>
          </ul>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </EnhancedModal>
  );
};

export default KeyboardShortcutsHelp;

