import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface TableHeaderCellProps<T> {
  field?: keyof T;
  label: string;
  sortable?: boolean;
  currentSortField?: keyof T | null;
  currentSortOrder?: 'asc' | 'desc';
  onSort?: (field: keyof T) => void;
  className?: string;
}

export function TableHeaderCell<T>({
  field,
  label,
  sortable = false,
  currentSortField,
  currentSortOrder,
  onSort,
  className,
}: TableHeaderCellProps<T>) {
  const isSorted = field && currentSortField === field;

  if (!sortable || !field || !onSort) {
    return <TableHead className={className}>{label}</TableHead>;
  }

  return (
    <TableHead className={className}>
      <button
        onClick={() => onSort(field)}
        className={cn(
          "flex items-center gap-2 hover:text-foreground transition-colors font-medium",
          isSorted ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
        {isSorted ? (
          currentSortOrder === 'asc' ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-50" />
        )}
      </button>
    </TableHead>
  );
}
