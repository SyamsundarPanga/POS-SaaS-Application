import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import DataTable, { Column } from '../../../components/ui/DataTable';

type Row = {
  id: number;
  name: string;
  qty: number;
};

const rows: Row[] = [
  { id: 1, name: 'Banana', qty: 2 },
  { id: 2, name: 'Apple', qty: 5 },
  { id: 3, name: 'Carrot', qty: 1 },
];

const columns: Column<Row>[] = [
  { key: 'name', header: 'Name' },
  { key: 'qty', header: 'Qty' },
];

describe('DataTable', () => {
  it('renders table data', () => {
    render(<DataTable data={rows} columns={columns} paginated={false} />);
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Carrot')).toBeInTheDocument();
  });

  it('sorts by column on header click', () => {
    const { container } = render(<DataTable data={rows} columns={columns} paginated={false} />);

    fireEvent.click(screen.getByText('Name'));
    let firstRowCells = container.querySelectorAll('tbody tr')[0].querySelectorAll('td');
    expect(firstRowCells[0]).toHaveTextContent('Apple');

    fireEvent.click(screen.getByText('Name'));
    firstRowCells = container.querySelectorAll('tbody tr')[0].querySelectorAll('td');
    expect(firstRowCells[0]).toHaveTextContent('Carrot');
  });

  it('filters rows from filter input', () => {
    render(<DataTable data={rows} columns={columns} paginated={false} filterable={true} />);
    const filterInputs = screen.getAllByPlaceholderText('Filter...');
    fireEvent.change(filterInputs[0], { target: { value: 'app' } });

    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.queryByText('Banana')).not.toBeInTheDocument();
    expect(screen.queryByText('Carrot')).not.toBeInTheDocument();
  });

  it('supports row click callback', () => {
    const onRowClick = jest.fn();
    render(<DataTable data={rows} columns={columns} paginated={false} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText('Banana'));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('shows pagination controls when needed', () => {
    const manyRows: Row[] = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      qty: i + 1,
    }));

    render(<DataTable data={manyRows} columns={columns} pageSize={10} paginated={true} />);

    expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
  });

  it('renders empty state message', () => {
    render(<DataTable data={[]} columns={columns} emptyMessage="No rows found" />);
    expect(screen.getByText('No rows found')).toBeInTheDocument();
  });
});
