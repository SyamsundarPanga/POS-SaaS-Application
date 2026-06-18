import React from 'react';
import { render } from '../../test-utils';
import LoadingSkeleton from '../../../components/ui/LoadingSkeleton';

describe('LoadingSkeleton', () => {
  it('renders text variant with specified count', () => {
    const { container } = render(<LoadingSkeleton variant="text" count={3} />);
    expect(container.querySelectorAll('.skeleton').length).toBe(3);
  });

  it('renders circle variant with custom size', () => {
    const { container } = render(
      <LoadingSkeleton variant="circle" count={2} width="40px" height="40px" />
    );
    const items = container.querySelectorAll('.skeleton');
    expect(items.length).toBe(2);
    expect((items[0] as HTMLElement).style.width).toBe('40px');
    expect((items[0] as HTMLElement).style.height).toBe('40px');
  });

  it('renders table variant rows', () => {
    const { container } = render(<LoadingSkeleton variant="table" count={4} />);
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(4);
  });
});

