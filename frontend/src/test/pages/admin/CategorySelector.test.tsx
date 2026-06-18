import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CategorySelector from '../../../pages/admin/CategorySelector';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

jest.mock('../../../store/hooks');
jest.mock('../../../store/slices/categorySlice', () => ({
  fetchCategoryHierarchy: jest.fn(() => ({ type: 'categories/fetchHierarchy' })),
}));

describe('CategorySelector', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    (useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useAppSelector as jest.Mock).mockImplementation((selector: any) =>
      selector({
        categories: {
          hierarchy: [{ id: 1, name: 'Beverages', subcategories: [] }],
          loading: false,
        },
      }),
    );
  });

  it('renders options and triggers onSelect', () => {
    const onSelect = jest.fn();
    render(<CategorySelector onSelect={onSelect} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});

