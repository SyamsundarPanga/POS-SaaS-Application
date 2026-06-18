import React from 'react';
import { fireEvent, render, screen } from '../../test-utils';
import KeyboardShortcutsHelp from '../../../features/pos/KeyboardShortcutsHelp';

jest.mock('../../../components/ui/EnhancedModal', () => {
  return ({ isOpen, children }: any) => (isOpen ? <div>{children}</div> : null);
});

describe('POS KeyboardShortcutsHelp', () => {
  it('renders shortcuts and closes', () => {
    const onClose = jest.fn();
    render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);

    expect(screen.getByText('Focus product search')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /got it/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
