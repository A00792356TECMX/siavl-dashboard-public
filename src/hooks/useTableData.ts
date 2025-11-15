import { useState, useMemo, useCallback } from 'react';

export type SortOrder = 'asc' | 'desc';

interface UseTableDataProps<T> {
  data: T[];
  searchFields: (keyof T)[];
  initialPageSize?: number;
}

export function useTableData<T extends Record<string, any>>({
  data,
  searchFields,
  initialPageSize = 10,
}: UseTableDataProps<T>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;

    const searchLower = search.toLowerCase();
    return data.filter((item) => {
      return searchFields.some((field) => {
        const value = item[field];
        if (value == null) return false;
        return String(value).toLowerCase().includes(searchLower);
      });
    });
  }, [data, search, searchFields]);

  // Sort filtered data
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Handle dates (check if valid date string or timestamp)
      const aDate = new Date(aVal);
      const bDate = new Date(bVal);
      if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
        return sortOrder === 'asc'
          ? aDate.getTime() - bDate.getTime()
          : bDate.getTime() - aDate.getTime();
      }

      // Handle strings (case-insensitive)
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (sortOrder === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [filteredData, sortField, sortOrder]);

  // Paginate sorted data
  const pageData = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, page, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Handle sort
  const handleSort = useCallback((field: keyof T) => {
    if (sortField === field) {
      // Toggle sort order
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      // New field, start with asc
      setSortField(field);
      setSortOrder('asc');
    }
    // Reset to first page when sorting
    setPage(1);
  }, [sortField]);

  // Handle page size change
  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page
  }, []);

  // Handle search change
  const handleSearchChange = useCallback((newSearch: string) => {
    setSearch(newSearch);
    setPage(1); // Reset to first page
  }, []);

  return {
    // Data
    filteredData: sortedData,
    pageData,
    totalResults: sortedData.length,
    
    // Pagination
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize: handlePageSizeChange,
    
    // Search
    search,
    setSearch: handleSearchChange,
    
    // Sort
    sortField,
    sortOrder,
    handleSort,
  };
}
