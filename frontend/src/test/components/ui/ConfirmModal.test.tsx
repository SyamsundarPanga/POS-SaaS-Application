import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import ConfirmModal from '../../../components/ui/ConfirmModal';

describe('ConfirmModal', () => {
  const onClose = jest.fn();
  const onConfirm = jest.fn();

  beforeEach(() => {
    onClose.mockClear();
    onConfirm.mockClear();
  });

  it('does not render when closed', () => {
    render(
      <ConfirmModal
        isOpen={false}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Delete item"
        message="Are you sure?"
      />
    );

    expect(screen.queryByText('Delete item')).not.toBeInTheDocument();
  });

  it('renders title, message, and buttons when open', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Delete item"
        message="Are you sure?"
        confirmText="Delete"
      />
    );

    expect(screen.getByText('Delete item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('handles cancel and confirm actions', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Delete item"
        message="Are you sure?"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows loading state and disables buttons', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Delete item"
        message="Are you sure?"
        loading={true}
      />
    );

    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Processing...' })).toBeDisabled();
  });
});

