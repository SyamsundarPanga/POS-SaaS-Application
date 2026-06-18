import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import FileUpload from '../../../components/ui/FileUpload';

describe('FileUpload', () => {
  beforeAll(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: jest.fn(() => 'blob:preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: jest.fn(),
    });
  });

  it('uploads a valid file and calls onUpload', async () => {
    const onUpload = jest.fn();
    const onError = jest.fn();
    const { container } = render(
      <FileUpload onUpload={onUpload} onError={onError} accept=".png" maxSize={2 * 1024 * 1024} />
    );

    const file = new File(['hello'], 'sample.png', { type: 'image/png' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload).toHaveBeenCalledWith([file]);
    expect(onError).not.toHaveBeenCalled();
    expect(screen.getByText('sample.png')).toBeInTheDocument();
  });

  it('shows validation error for invalid file type', () => {
    const onUpload = jest.fn();
    const onError = jest.fn();
    const { container } = render(<FileUpload onUpload={onUpload} onError={onError} accept=".png" />);

    const invalidFile = new File(['hello'], 'sample.pdf', { type: 'application/pdf' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onUpload).not.toHaveBeenCalled();
    expect(screen.getByText(/File type not accepted/i)).toBeInTheDocument();
  });

  it('removes a file from list', () => {
    const onUpload = jest.fn();
    render(<FileUpload onUpload={onUpload} />);

    const file = new File(['hello'], 'remove-me.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('remove-me.txt')).toBeInTheDocument();
    const fileRow = screen.getByText('remove-me.txt').closest('.flex.items-center.gap-4.p-4');
    const removeButton = fileRow?.querySelector('button') as HTMLButtonElement;
    fireEvent.click(removeButton);
    expect(screen.queryByText('remove-me.txt')).not.toBeInTheDocument();
  });
});
