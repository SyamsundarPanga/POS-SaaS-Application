import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import DateRangePicker, { DateRangePreset } from '../../../components/ui/DateRangePicker';

describe('DateRangePicker', () => {
  it('renders trigger button', () => {
    render(<DateRangePicker startDate={null} endDate={null} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: /select date range/i })).toBeInTheDocument();
  });

  it('opens dropdown and applies preset range', () => {
    const onChange = jest.fn();
    const presets: DateRangePreset[] = [
      {
        label: 'Custom Preset',
        getValue: () => ({
          startDate: new Date(2026, 0, 1),
          endDate: new Date(2026, 0, 10),
        }),
      },
    ];

    render(<DateRangePicker startDate={null} endDate={null} onChange={onChange} presets={presets} />);

    fireEvent.click(screen.getByRole('button', { name: /select date range/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Custom Preset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].startDate).not.toBeNull();
    expect(onChange.mock.calls[0][0].endDate).not.toBeNull();
  });

  it('clears selected range', () => {
    const onChange = jest.fn();
    render(
      <DateRangePicker
        startDate={new Date(2026, 0, 1)}
        endDate={new Date(2026, 0, 10)}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(onChange).toHaveBeenCalledWith({ startDate: null, endDate: null });
  });
});

