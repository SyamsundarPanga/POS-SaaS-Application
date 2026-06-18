import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import Modal from '../../../components/common/Modal';

describe('Modal Component', () => {
  const mockOnClose = jest.fn();
  const modalTitle = 'Test Modal Title';
  const modalContent = 'This is the modal content';

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('does not render when open is false', () => {
    const { container } = render(
      <Modal open={false} onClose={mockOnClose} title={modalTitle}>
        {modalContent}
      </Modal>
    );
    
    // The container should be empty
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(modalTitle)).not.toBeInTheDocument();
  });

  it('renders correctly when open is true', () => {
    render(
      <Modal open={true} onClose={mockOnClose} title={modalTitle}>
        <div data-testid="modal-child">{modalContent}</div>
      </Modal>
    );

    expect(screen.getByText(modalTitle)).toBeInTheDocument();
    expect(screen.getByTestId('modal-child')).toBeInTheDocument();
    expect(screen.getByText(modalContent)).toBeInTheDocument();
  });

  it('calls onClose when the close button (✕) is clicked', () => {
    render(
      <Modal open={true} onClose={mockOnClose} title={modalTitle}>
        {modalContent}
      </Modal>
    );

    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('applies backdrop styling based on showBackdrop prop', () => {
    const { rerender, container } = render(
      <Modal open={true} onClose={mockOnClose} title={modalTitle} showBackdrop={true}>
        {modalContent}
      </Modal>
    );

    // Check for backdrop class (bg-black)
    const backdrop = container.firstChild as HTMLElement;
    expect(backdrop).toHaveClass('bg-black');

    rerender(
      <Modal open={true} onClose={mockOnClose} title={modalTitle} showBackdrop={false}>
        {modalContent}
      </Modal>
    );
    
    expect(backdrop).toHaveClass('pointer-events-none');
    expect(backdrop).not.toHaveClass('bg-black');
  });

  it('applies custom className to the modal container', () => {
    render(
      <Modal open={true} onClose={mockOnClose} title={modalTitle} className="w-[500px] custom-modal">
        {modalContent}
      </Modal>
    );

    // Find the inner modal box (the one with the white background)
    const modalBox = screen.getByText(modalTitle).closest('div')?.parentElement;
    expect(modalBox).toHaveClass('w-[500px]');
    expect(modalBox).toHaveClass('custom-modal');
  });
});