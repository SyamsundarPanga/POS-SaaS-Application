import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import EnhancedModal from '../../../components/ui/EnhancedModal';

describe('EnhancedModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    onClose.mockClear();
  });

  it('does not render when closed', () => {
    render(
      <EnhancedModal isOpen={false} onClose={onClose} title="Test modal">
        <div>Modal content</div>
      </EnhancedModal>
    );
    expect(screen.queryByText('Test modal')).not.toBeInTheDocument();
  });

  it('renders when open', () => {
    render(
      <EnhancedModal isOpen={true} onClose={onClose} title="Test modal">
        <div>Modal content</div>
      </EnhancedModal>
    );
    expect(screen.getByText('Test modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('closes on close button click', () => {
    render(
      <EnhancedModal isOpen={true} onClose={onClose} title="Test modal">
        <div>Modal content</div>
      </EnhancedModal>
    );
    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on escape key when enabled', () => {
    render(
      <EnhancedModal isOpen={true} onClose={onClose} title="Test modal" closeOnEsc={true}>
        <div>Modal content</div>
      </EnhancedModal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

