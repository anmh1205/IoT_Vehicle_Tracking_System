/**
 * Data Table Toolbar Component
 * Provides search, filter, and export functionality
 */
'use client';

import * as React from 'react';
import { Table } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Search, X, Download } from 'lucide-react';

interface DataTableToolbarProps<TData> {
    table: Table<TData>;
    searchColumn?: string;
    searchPlaceholder?: string;
    filterColumn?: string;
    filterOptions?: { label: string; value: string }[];
    onExport?: () => void;
}

export function DataTableToolbar<TData>({
    table,
    searchColumn,
    searchPlaceholder = 'Search...',
    filterColumn,
    filterOptions,
    onExport,
}: DataTableToolbarProps<TData>) {
    const [searchValue, setSearchValue] = React.useState('');
    const [filterValue, setFilterValue] = React.useState('');

    const isFiltered = searchValue !== '' || filterValue !== '';

    const handleSearch = (value: string) => {
        setSearchValue(value);
        if (searchColumn) {
            table.getColumn(searchColumn)?.setFilterValue(value);
        } else {
            table.setGlobalFilter(value);
        }
    };

    const handleFilter = (value: string) => {
        setFilterValue(value);
        if (filterColumn) {
            table.getColumn(filterColumn)?.setFilterValue(value === 'all' ? '' : value);
        }
    };

    const handleReset = () => {
        setSearchValue('');
        setFilterValue('');
        table.resetColumnFilters();
        table.setGlobalFilter('');
    };

    return (
        <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={searchPlaceholder}
                        value={searchValue}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Filter */}
                {filterColumn && filterOptions && (
                    <Select value={filterValue} onValueChange={handleFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {filterOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {/* Reset */}
                {isFiltered && (
                    <Button
                        variant="ghost"
                        onClick={handleReset}
                        className="px-2 lg:px-3"
                    >
                        Reset
                        <X className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Export */}
            {onExport && (
                <Button variant="outline" onClick={onExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
            )}
        </div>
    );
}
