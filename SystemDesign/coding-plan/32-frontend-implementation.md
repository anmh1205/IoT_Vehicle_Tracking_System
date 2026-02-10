# Frontend Implementation Guide (IVM26 Pattern)

> Huong dan implement chi tiet — code patterns, component templates, va quy tac tuyet doi.
> KHONG placeholder. KHONG "Coming Soon". MOI page PHAI fully functional.

---

## ABSOLUTE RULE: No Placeholders

Agents MUST NOT:
- Write "Coming Soon", "future update", "will be available", "TODO", or any placeholder text
- Leave any page with a dashed-border empty state instead of real functionality
- Skip any feature listed in this plan
- Defer any functionality to a "future phase"

Every page MUST be fully functional with:
- Real API integration (not mock data, not random coordinates)
- Real form validation (Zod schemas)
- Real CRUD operations (create, read, update, delete)
- Real error handling (toast notifications via Sonner)
- Real loading states (Skeleton components from shadcn/ui)
- Real empty states (icon + message + action button)

If an API endpoint is not yet available, the agent MUST:
1. Create the API service function with the correct endpoint
2. Create the TanStack Query hook
3. Build the complete UI
4. Document the missing endpoint in `.tracking/CURRENT_TASKS.md` for the backend agent

---

## 1. IVM26 Component Patterns (PHAI tuan thu)

### 1.1 Page Pattern (Every CRUD page follows this)

```tsx
// app/(dashboard)/{feature}/page.tsx
'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { DataTable } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { columns } from '@/features/{feature}/components/{feature}-columns';
import { {Feature}Form } from '@/features/{feature}/components/{feature}-form';
import { use{Features} } from '@/features/{feature}/hooks/use-{features}';
import { useDelete{Feature} } from '@/features/{feature}/hooks/use-delete-{feature}';
import { ConfirmDialog } from '@/components/common/confirm-dialog';

export default function {Features}Page() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<{Feature} | null>(null);
  const [deleteItem, setDeleteItem] = useState<{Feature} | null>(null);
  const { data, isLoading } = use{Features}();
  const deleteMutation = useDelete{Feature}();

  return (
    <PageContainer
      pageTitle="{Vietnamese title}"
      pageDescription="{Vietnamese description}"
      pageHeaderAction={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Them {feature}
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={data ?? []}
        searchKey="{searchField}"
        isLoading={isLoading}
      />

      <{Feature}Form
        open={createOpen || !!editItem}
        onOpenChange={(v) => {
          if (!v) {
            setCreateOpen(false);
            setEditItem(null);
          }
        }}
        defaultValues={editItem}
      />

      <ConfirmDialog
        open={!!deleteItem}
        title="Xoa {feature}"
        description={`Ban co chac muon xoa ${deleteItem?.name}?`}
        variant="destructive"
        confirmLabel="Xoa"
        onCancel={() => setDeleteItem(null)}
        onConfirm={() => {
          deleteMutation.mutate(deleteItem!.id, {
            onSuccess: () => setDeleteItem(null),
          });
        }}
      />
    </PageContainer>
  );
}
```

### 1.2 DataTable Column Definition Pattern

```tsx
// features/{feature}/components/{feature}-columns.tsx
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';

export function getColumns(actions: {
  onView: (item: T) => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
}): ColumnDef<T>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ten" />
      ),
    },
    {
      accessorKey: 'status',
      header: 'Trang thai',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const variants: Record<string, string> = {
          active: 'success',
          inactive: 'secondary',
          maintenance: 'warning',
        };
        return (
          <Badge variant={variants[status] ?? 'default'}>{status}</Badge>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => actions.onView(row.original)}>
              <Eye className="mr-2 h-4 w-4" /> Xem chi tiet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions.onEdit(row.original)}>
              <Pencil className="mr-2 h-4 w-4" /> Chinh sua
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => actions.onDelete(row.original)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Xoa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
```

### 1.3 Form Dialog Pattern (react-hook-form + zod)

```tsx
// features/{feature}/components/{feature}-form.tsx
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
  {feature}Schema,
  type {Feature}FormValues,
} from '@/lib/validations/{feature}.schema';
import { useCreate{Feature} } from '../hooks/use-create-{feature}';
import { useUpdate{Feature} } from '../hooks/use-update-{feature}';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: {Feature} | null;
}

export function {Feature}Form({ open, onOpenChange, defaultValues }: Props) {
  const isEdit = !!defaultValues;
  const form = useForm<{Feature}FormValues>({
    resolver: zodResolver({feature}Schema),
    defaultValues: { /* initial empty values */ },
  });

  // Populate form when editing
  useEffect(() => {
    if (defaultValues) {
      form.reset({
        field1: defaultValues.field1,
        field2: defaultValues.field2,
        // ALL fields populated - never leave a field out
      });
    } else {
      form.reset({ /* empty defaults */ });
    }
  }, [defaultValues, form]);

  const createMutation = useCreate{Feature}();
  const updateMutation = useUpdate{Feature}();
  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: {Feature}FormValues) {
    const mutation = isEdit ? updateMutation : createMutation;
    const payload = isEdit ? { id: defaultValues!.id, ...values } : values;

    mutation.mutate(payload, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Chinh sua' : 'Them moi'} {feature}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="field1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Label</FormLabel>
                  <FormControl>
                    <Input placeholder="..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* ... more FormFields for every field in the schema ... */}
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
              >
                Huy
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEdit ? 'Cap nhat' : 'Tao moi'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### 1.4 API Hook Patterns

```typescript
// features/{feature}/hooks/use-{features}.ts
import { useQuery } from '@tanstack/react-query';
import { {feature}Services } from '@/lib/api/{feature}';

export function use{Features}(filters?: {Feature}Filters) {
  return useQuery({
    queryKey: ['{features}', filters],
    queryFn: () => {feature}Services.getList(filters),
  });
}
```

```typescript
// features/{feature}/hooks/use-create-{feature}.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { {feature}Services } from '@/lib/api/{feature}';
import { toast } from 'sonner';

export function useCreate{Feature}() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: {feature}Services.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['{features}'] });
      toast.success('{Feature} da duoc tao');
    },
    onError: (error: any) => {
      toast.error('Khong the tao {feature}', {
        description: error.message || 'Vui long thu lai',
      });
    },
  });
}
```

```typescript
// features/{feature}/hooks/use-update-{feature}.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { {feature}Services } from '@/lib/api/{feature}';
import { toast } from 'sonner';

export function useUpdate{Feature}() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Update{Feature}Dto & { id: number }) =>
      {feature}Services.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['{features}'] });
      toast.success('{Feature} da duoc cap nhat');
    },
    onError: (error: any) => {
      toast.error('Khong the cap nhat {feature}', {
        description: error.message || 'Vui long thu lai',
      });
    },
  });
}
```

```typescript
// features/{feature}/hooks/use-delete-{feature}.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { {feature}Services } from '@/lib/api/{feature}';
import { toast } from 'sonner';

export function useDelete{Feature}() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => {feature}Services.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['{features}'] });
      toast.success('{Feature} da duoc xoa');
    },
    onError: (error: any) => {
      toast.error('Khong the xoa {feature}', {
        description: error.message || 'Vui long thu lai',
      });
    },
  });
}
```

### 1.5 API Service Pattern

```typescript
// lib/api/{feature}.ts
import { apiClient } from './client';

export const {feature}Services = {
  getList: (params?: any) =>
    apiClient.get('/api/v1/{features}', { params }).then((r) => r.data),

  getById: (id: number) =>
    apiClient.get(`/api/v1/{features}/${id}`).then((r) => r.data),

  create: (data: Create{Feature}Dto) =>
    apiClient.post('/api/v1/{features}', data).then((r) => r.data),

  update: (data: Update{Feature}Dto & { id: number }) => {
    const { id, ...body } = data;
    return apiClient.put(`/api/v1/{features}/${id}`, body).then((r) => r.data);
  },

  delete: (id: number) =>
    apiClient.delete(`/api/v1/{features}/${id}`).then((r) => r.data),
};
```

### 1.6 Zod Schema Pattern

```typescript
// lib/validations/{feature}.schema.ts
import { z } from 'zod';

export const {feature}Schema = z.object({
  name: z
    .string()
    .min(1, 'Ten la bat buoc')
    .max(100, 'Ten toi da 100 ky tu'),
  status: z.enum(['active', 'inactive', 'maintenance'], {
    required_error: 'Trang thai la bat buoc',
  }),
  description: z.string().optional(),
  // ... every field with Vietnamese error messages
});

export type {Feature}FormValues = z.infer<typeof {feature}Schema>;
```

---

## 2. DataTable Component Specification

### 2.1 DataTable Wrapper (components/common/data-table.tsx)

This wraps `@tanstack/react-table` with shadcn/ui Table. It is the ONLY table component used across the application. No hand-rolled tables.

```tsx
// components/common/data-table.tsx
'use client';

import { useState } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronLeft, ChevronRight, Settings2, Search } from 'lucide-react';
import { EmptyState } from './empty-state';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
  pagination?: boolean;
  pageSize?: number;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  toolbar?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Tim kiem...',
  isLoading = false,
  pagination = true,
  pageSize = 10,
  emptyIcon,
  emptyTitle = 'Khong co du lieu',
  emptyDescription,
  emptyAction,
  toolbar,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: pagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnFilters, columnVisibility },
    initialState: { pagination: { pageSize } },
  });

  // Loading state: render skeleton rows
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: search + column visibility + custom toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {searchKey && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={
                  (table.getColumn(searchKey)?.getFilterValue() as string) ?? ''
                }
                onChange={(e) =>
                  table.getColumn(searchKey)?.setFilterValue(e.target.value)
                }
                className="max-w-sm pl-8"
              />
            </div>
          )}
          {toolbar}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="mr-2 h-4 w-4" /> Cot hien thi
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onCheckedChange={(v) => col.toggleVisibility(!!v)}
                >
                  {col.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-48 text-center"
                >
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Hien thi {table.getRowModel().rows.length} /{' '}
            {table.getFilteredRowModel().rows.length} ban ghi
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Trang {table.getState().pagination.pageIndex + 1} /{' '}
              {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 2.2 DataTableColumnHeader (Sortable)

```tsx
// components/common/data-table-column-header.tsx
'use client';

import { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('-ml-3 h-8', className)}
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {title}
      {column.getIsSorted() === 'desc' ? (
        <ArrowDown className="ml-2 h-4 w-4" />
      ) : column.getIsSorted() === 'asc' ? (
        <ArrowUp className="ml-2 h-4 w-4" />
      ) : (
        <ChevronsUpDown className="ml-2 h-4 w-4" />
      )}
    </Button>
  );
}
```

---

## 3. Shared Components Specification

### 3.1 ConfirmDialog

```tsx
// components/common/confirm-dialog.tsx
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
  confirmLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  isPending?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  variant = 'default',
  confirmLabel = 'Xac nhan',
  cancelLabel = 'Huy',
  onCancel,
  onConfirm,
  isPending = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isPending}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              variant === 'destructive' &&
                'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            )}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### 3.2 EmptyState

```tsx
// components/common/empty-state.tsx
'use client';

import { Button } from '@/components/ui/button';
import { InboxIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-muted-foreground/40">
        {icon ?? <InboxIcon className="h-12 w-12" />}
      </div>
      <h3 className="mb-1 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mb-4 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

### 3.3 StatCard

```tsx
// components/common/stat-card.tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp } from 'lucide-react';

const gradientMap = {
  primary: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
  success: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
  warning: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
  danger: 'from-red-500/10 to-red-600/5 border-red-500/20',
  secondary: 'from-slate-500/10 to-slate-600/5 border-slate-500/20',
};

const iconColorMap = {
  primary: 'text-blue-600 bg-blue-500/10',
  success: 'text-emerald-600 bg-emerald-500/10',
  warning: 'text-amber-600 bg-amber-500/10',
  danger: 'text-red-600 bg-red-500/10',
  secondary: 'text-slate-600 bg-slate-500/10',
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient?: keyof typeof gradientMap;
  description?: string;
  trend?: { value: number; isPositive: boolean };
}

export function StatCard({
  title,
  value,
  icon,
  gradient = 'primary',
  description,
  trend,
}: StatCardProps) {
  return (
    <Card className={cn('bg-gradient-to-br border', gradientMap[gradient])}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <div className="flex items-center gap-1 text-xs">
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span
                  className={cn(
                    trend.isPositive ? 'text-emerald-600' : 'text-red-600'
                  )}
                >
                  {trend.isPositive ? '+' : ''}
                  {trend.value}%
                </span>
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-lg',
              iconColorMap[gradient]
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3.4 PageContainer

```tsx
// components/layout/page-container.tsx
'use client';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface PageContainerProps {
  pageTitle: string;
  pageDescription?: string;
  pageHeaderAction?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  children: React.ReactNode;
}

export function PageContainer({
  pageTitle,
  pageDescription,
  pageHeaderAction,
  breadcrumbs,
  children,
}: PageContainerProps) {
  return (
    <div className="flex flex-col gap-6 p-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {item.href ? (
                    <BreadcrumbLink href={item.href}>
                      {item.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
          {pageDescription && (
            <p className="text-sm text-muted-foreground">{pageDescription}</p>
          )}
        </div>
        {pageHeaderAction && <div>{pageHeaderAction}</div>}
      </div>

      {children}
    </div>
  );
}
```

---

## 4. Map Implementation Guide

### 4.1 Map Page (SSR-safe dynamic import)

Leaflet does NOT support SSR. Every map component MUST use `next/dynamic` with `ssr: false`.

```tsx
// components/map/map-container.tsx
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

export const MapContainer = dynamic(() => import('./map-view'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Skeleton className="h-full w-full" />
    </div>
  ),
});
```

```tsx
// components/map/map-view.tsx (client-only, loaded via dynamic import)
'use client';

import { MapContainer as LeafletMap, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  children?: React.ReactNode;
}

export default function MapView({
  center = [10.7626, 106.6602], // Ho Chi Minh City default
  zoom = 13,
  children,
}: MapViewProps) {
  return (
    <LeafletMap
      center={center}
      zoom={zoom}
      className="h-full w-full rounded-lg"
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {children}
    </LeafletMap>
  );
}
```

### 4.2 Vehicle Markers (custom divIcon with REAL data)

```tsx
// components/map/vehicle-marker.tsx
'use client';

import L from 'leaflet';
import { Marker, Popup } from 'react-leaflet';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

// Status colors - NEVER random, always based on real device status
const statusColors: Record<string, string> = {
  running: '#22c55e',       // green - device is moving
  stopped: '#6b7280',       // gray - device is stationary
  idle: '#eab308',          // yellow - engine on, not moving
  disconnected: '#ef4444',  // red - no signal
};

const statusLabels: Record<string, string> = {
  running: 'Dang chay',
  stopped: 'Dung',
  idle: 'Cho',
  disconnected: 'Mat ket noi',
};

function createVehicleIcon(status: string, heading?: number) {
  const color = statusColors[status] ?? statusColors.disconnected;
  const rotation = heading ?? 0;

  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        border-radius: 50%;
        width: 28px;
        height: 28px;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        transform: rotate(${rotation}deg);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
        </svg>
      </div>
    `,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

interface VehicleMarkerProps {
  deviceId: string;
  plateNumber: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading?: number;
  status: string;
  lastSeen: string;
  onClick?: () => void;
}

export function VehicleMarker({
  deviceId,
  plateNumber,
  latitude,
  longitude,
  speed,
  heading,
  status,
  lastSeen,
  onClick,
}: VehicleMarkerProps) {
  const icon = createVehicleIcon(status, heading);

  return (
    <Marker
      position={[latitude, longitude]}
      icon={icon}
      eventHandlers={{ click: () => onClick?.() }}
    >
      <Popup>
        <div className="min-w-[200px] space-y-1 text-sm">
          <p className="font-bold">{plateNumber}</p>
          <p>Thiet bi: {deviceId}</p>
          <p>Toc do: {speed} km/h</p>
          <p>
            Trang thai:{' '}
            <span style={{ color: statusColors[status] }}>
              {statusLabels[status]}
            </span>
          </p>
          <p className="text-muted-foreground">
            Cap nhat:{' '}
            {formatDistanceToNow(new Date(lastSeen), {
              addSuffix: true,
              locale: vi,
            })}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}
```

### 4.3 Geofence Drawing (Leaflet.Draw)

```tsx
// components/map/geofence-editor.tsx
'use client';

import { useRef, useEffect } from 'react';
import { FeatureGroup, Circle, Polygon, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

interface GeofenceShape {
  type: 'circle' | 'polygon';
  // Circle fields
  centerLatitude?: number;
  centerLongitude?: number;
  radiusMeters?: number;
  // Polygon fields
  coordinates?: [number, number][];
}

interface GeofenceEditorProps {
  geofenceType: 'circle' | 'polygon';
  value?: GeofenceShape;
  onChange: (shape: GeofenceShape) => void;
}

export function GeofenceEditor({
  geofenceType,
  value,
  onChange,
}: GeofenceEditorProps) {
  const featureGroupRef = useRef<L.FeatureGroup>(null);

  return (
    <FeatureGroup ref={featureGroupRef}>
      {/* Render existing shape if editing */}
      {value?.type === 'circle' &&
        value.centerLatitude &&
        value.centerLongitude && (
          <Circle
            center={[value.centerLatitude, value.centerLongitude]}
            radius={value.radiusMeters ?? 500}
            pathOptions={{ color: '#3b82f6', fillOpacity: 0.2 }}
          />
        )}
      {value?.type === 'polygon' && value.coordinates && (
        <Polygon
          positions={value.coordinates}
          pathOptions={{ color: '#3b82f6', fillOpacity: 0.2 }}
        />
      )}

      {/* Drawing controls */}
      <EditControl
        position="topright"
        draw={{
          circle: geofenceType === 'circle',
          polygon: geofenceType === 'polygon',
          rectangle: false,
          marker: false,
          polyline: false,
          circlemarker: false,
        }}
        edit={{
          edit: true,
          remove: true,
        }}
        onCreated={(e) => {
          if (e.layerType === 'circle') {
            const { lat, lng } = e.layer.getLatLng();
            const radius = e.layer.getRadius();
            onChange({
              type: 'circle',
              centerLatitude: lat,
              centerLongitude: lng,
              radiusMeters: Math.round(radius),
            });
          } else if (e.layerType === 'polygon') {
            const coords = e.layer
              .getLatLngs()[0]
              .map((ll: L.LatLng) => [ll.lat, ll.lng] as [number, number]);
            onChange({ type: 'polygon', coordinates: coords });
          }
        }}
        onEdited={(e) => {
          e.layers.eachLayer((layer: any) => {
            if (layer.getRadius) {
              const { lat, lng } = layer.getLatLng();
              onChange({
                type: 'circle',
                centerLatitude: lat,
                centerLongitude: lng,
                radiusMeters: Math.round(layer.getRadius()),
              });
            } else if (layer.getLatLngs) {
              const coords = layer
                .getLatLngs()[0]
                .map((ll: L.LatLng) => [ll.lat, ll.lng] as [number, number]);
              onChange({ type: 'polygon', coordinates: coords });
            }
          });
        }}
        onDeleted={() => {
          onChange({ type: geofenceType });
        }}
      />
    </FeatureGroup>
  );
}
```

### 4.4 Trip Replay

```tsx
// components/map/trip-replay.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Marker, Polyline, useMap } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, FastForward } from 'lucide-react';

// Speed-colored polyline segments
function getSpeedColor(speed: number): string {
  if (speed < 30) return '#22c55e';  // green - slow
  if (speed < 60) return '#84cc16';  // lime - normal city
  if (speed < 80) return '#eab308';  // yellow - fast city
  if (speed < 100) return '#f97316'; // orange - highway
  return '#ef4444';                   // red - speeding
}

interface TripPoint {
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: string;
}

interface TripReplayProps {
  points: TripPoint[];
}

export function TripReplay({ points }: TripReplayProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const map = useMap();

  // Build colored segments
  const segments = points.slice(0, -1).map((point, i) => ({
    positions: [
      [point.latitude, point.longitude] as [number, number],
      [points[i + 1].latitude, points[i + 1].longitude] as [number, number],
    ],
    color: getSpeedColor(point.speed),
  }));

  // Playback loop
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= points.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, playbackSpeed, points.length]);

  // Pan map to current point
  useEffect(() => {
    if (points[currentIndex]) {
      map.panTo([points[currentIndex].latitude, points[currentIndex].longitude]);
    }
  }, [currentIndex, map, points]);

  const togglePlay = useCallback(() => setIsPlaying((p) => !p), []);
  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
  }, []);
  const cycleSpeed = useCallback(() => {
    setPlaybackSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1));
  }, []);

  const currentPoint = points[currentIndex];

  return (
    <>
      {/* Colored route segments (up to current position) */}
      {segments.slice(0, currentIndex).map((seg, i) => (
        <Polyline
          key={i}
          positions={seg.positions}
          pathOptions={{ color: seg.color, weight: 4 }}
        />
      ))}

      {/* Remaining route (gray) */}
      {segments.slice(currentIndex).map((seg, i) => (
        <Polyline
          key={`future-${i}`}
          positions={seg.positions}
          pathOptions={{ color: '#d1d5db', weight: 2, dashArray: '8 4' }}
        />
      ))}

      {/* Current position marker */}
      {currentPoint && (
        <Marker
          position={[currentPoint.latitude, currentPoint.longitude]}
        />
      )}

      {/* Playback controls overlay */}
      <div className="leaflet-bottom leaflet-left">
        <div className="leaflet-control m-2 rounded-lg bg-background/95 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={reset}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button variant="default" size="icon" onClick={togglePlay}>
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={cycleSpeed}>
              <FastForward className="mr-1 h-4 w-4" /> {playbackSpeed}x
            </Button>
            <div className="w-48">
              <Slider
                value={[currentIndex]}
                max={points.length - 1}
                step={1}
                onValueChange={([v]) => setCurrentIndex(v)}
              />
            </div>
            <span className="min-w-[80px] text-xs text-muted-foreground">
              {currentPoint
                ? new Date(currentPoint.timestamp).toLocaleTimeString('vi-VN')
                : ''}
            </span>
          </div>
          {currentPoint && (
            <p className="mt-1 text-xs text-muted-foreground">
              Toc do: {currentPoint.speed} km/h | Diem:{' '}
              {currentIndex + 1}/{points.length}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
```

### 4.5 Speed Legend

```tsx
// components/map/speed-legend.tsx
export function SpeedLegend() {
  const items = [
    { color: '#22c55e', label: '< 30 km/h' },
    { color: '#84cc16', label: '30-60 km/h' },
    { color: '#eab308', label: '60-80 km/h' },
    { color: '#f97316', label: '80-100 km/h' },
    { color: '#ef4444', label: '> 100 km/h' },
  ];

  return (
    <div className="leaflet-bottom leaflet-right">
      <div className="leaflet-control m-2 rounded-lg bg-background/95 p-3 shadow-lg backdrop-blur">
        <p className="mb-2 text-xs font-semibold">Toc do</p>
        {items.map((item) => (
          <div key={item.color} className="flex items-center gap-2 text-xs">
            <div
              className="h-3 w-6 rounded"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 5. Real-time Integration Guide

### 5.1 Socket Provider

```tsx
// components/providers/socket-provider.tsx
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/store/auth-store';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;

    const newSocket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
```

### 5.2 Socket Events to TanStack Query Pattern

Every page that needs real-time updates MUST use a `use{Feature}Realtime()` hook that:
1. Subscribes to relevant Socket.IO events
2. Updates TanStack Query cache via `invalidateQueries` or `setQueryData`
3. Shows toast for important events (new alerts, critical status changes)
4. Cleans up on unmount

```typescript
// Pattern for all realtime hooks:
// features/{feature}/hooks/use-{feature}-realtime.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/components/providers/socket-provider';
import { toast } from 'sonner';

export function use{Feature}Realtime() {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join relevant room
    socket.emit('join', '{feature}-room');

    // Listen for events
    socket.on('{feature}.updated', (data) => {
      // Option A: Invalidate query (re-fetch from server)
      queryClient.invalidateQueries({ queryKey: ['{features}'] });

      // Option B: Optimistic update (update cache directly)
      queryClient.setQueryData(['{features}'], (old: any[]) => {
        if (!old) return [data];
        return old.map((item) =>
          item.id === data.id ? { ...item, ...data } : item
        );
      });
    });

    socket.on('{feature}.created', (data) => {
      queryClient.invalidateQueries({ queryKey: ['{features}'] });
      toast.info('Co {feature} moi', {
        description: data.name || data.title,
      });
    });

    // Cleanup
    return () => {
      socket.emit('leave', '{feature}-room');
      socket.off('{feature}.updated');
      socket.off('{feature}.created');
    };
  }, [socket, isConnected, queryClient]);
}
```

### 5.3 Events Table

| Event | Pages | Cache Action | UI Action |
|-------|-------|--------------|-----------|
| `device.status.changed` | Devices, Dashboard, Map | `invalidateQueries(['devices'])`, `invalidateQueries(['dashboard-stats'])` | Update badge color |
| `device.location.updated` | Map | `setQueryData(['device-locations'])` (optimistic, no re-fetch) | Move marker smoothly |
| `alert.new` | Alerts, Dashboard | `invalidateQueries(['alerts'])`, `invalidateQueries(['dashboard-stats'])` | `toast.warning()` with alert title |
| `alert.resolved` | Alerts | `invalidateQueries(['alerts'])` | None |
| `notification.new` | All pages (header badge) | `invalidateQueries(['notifications'])` | Increment unread badge count |
| `firmware.progress` | Firmware | `setQueryData(['firmware', deviceId])` progress field | Update progress bar |
| `stats.updated` | Dashboard | `invalidateQueries(['dashboard-stats'])` | None |
| `trip.started` | Trips, Map | `invalidateQueries(['trips'])` | None |
| `trip.ended` | Trips | `invalidateQueries(['trips'])` | None |

### 5.4 Device Location Realtime Hook

```typescript
// features/map/hooks/use-device-locations-realtime.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/components/providers/socket-provider';

interface DeviceLocation {
  deviceId: string;
  vehicleId: string;
  plateNumber: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  status: 'running' | 'stopped' | 'idle' | 'disconnected';
  lastSeen: string;
  batteryLevel?: number;
}

export function useDeviceLocationsRealtime() {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('join', 'dashboard');

    socket.on('device.location.updated', (data: DeviceLocation) => {
      queryClient.setQueryData(
        ['device-locations'],
        (old: DeviceLocation[] | undefined) => {
          if (!old) return [data];
          const exists = old.find((d) => d.deviceId === data.deviceId);
          if (exists) {
            return old.map((d) =>
              d.deviceId === data.deviceId ? { ...d, ...data } : d
            );
          }
          return [...old, data];
        }
      );
    });

    socket.on('device.status.changed', (data: { deviceId: string; status: string }) => {
      queryClient.setQueryData(
        ['device-locations'],
        (old: DeviceLocation[] | undefined) => {
          if (!old) return old;
          return old.map((d) =>
            d.deviceId === data.deviceId
              ? { ...d, status: data.status as DeviceLocation['status'] }
              : d
          );
        }
      );
    });

    return () => {
      socket.emit('leave', 'dashboard');
      socket.off('device.location.updated');
      socket.off('device.status.changed');
    };
  }, [socket, isConnected, queryClient]);
}
```

### 5.5 Alert Stream Hook

```typescript
// features/alerts/hooks/use-alert-stream.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/components/providers/socket-provider';
import { toast } from 'sonner';

interface Alert {
  id: number;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  deviceId: string;
  plateNumber?: string;
  createdAt: string;
}

export function useAlertStream() {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('join', 'alerts');

    socket.on('alert.new', (alert: Alert) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

      const toastFn =
        alert.severity === 'critical' ? toast.error : toast.warning;

      toastFn(alert.title, {
        description: alert.message,
        duration: alert.severity === 'critical' ? 10000 : 5000,
        action: {
          label: 'Xem',
          onClick: () => {
            window.location.href = '/dashboard/alerts';
          },
        },
      });
    });

    socket.on('alert.resolved', (data: { alertId: number }) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });

    return () => {
      socket.emit('leave', 'alerts');
      socket.off('alert.new');
      socket.off('alert.resolved');
    };
  }, [socket, isConnected, queryClient]);
}
```

### 5.6 Connection Status Indicator

```tsx
// components/layout/connection-status.tsx
'use client';

import { useSocket } from '@/components/providers/socket-provider';
import { Wifi, WifiOff } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function ConnectionStatus() {
  const { isConnected } = useSocket();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              isConnected ? 'bg-emerald-500' : 'bg-red-500'
            )}
          />
          {isConnected ? (
            <Wifi className="h-4 w-4 text-emerald-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {isConnected ? 'Da ket noi real-time' : 'Mat ket noi real-time'}
      </TooltipContent>
    </Tooltip>
  );
}
```

---

## 6. Error Handling Patterns

### 6.1 API Client Setup with Error Interceptor

```typescript
// lib/api/client.ts
import axios from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store/auth-store';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      toast.error('Loi ket noi', {
        description: 'Khong the ket noi den may chu. Vui long kiem tra mang.',
      });
      return Promise.reject(error);
    }

    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 401:
        useAuthStore.getState().logout();
        window.location.href = '/login';
        break;

      case 403:
        toast.error('Khong co quyen', {
          description: 'Ban khong co quyen thuc hien hanh dong nay.',
        });
        break;

      case 404:
        toast.error('Khong tim thay', {
          description: data?.message || 'Du lieu khong ton tai.',
        });
        break;

      case 422:
        // Validation errors: show field-level errors
        if (data?.errors && Array.isArray(data.errors)) {
          data.errors.forEach((err: { field: string; message: string }) => {
            toast.error(`Loi: ${err.field}`, { description: err.message });
          });
        } else {
          toast.error('Du lieu khong hop le', {
            description: data?.message || 'Vui long kiem tra lai.',
          });
        }
        break;

      case 429:
        toast.error('Qua nhieu yeu cau', {
          description: 'Vui long cho mot lat roi thu lai.',
        });
        break;

      case 500:
        toast.error('Loi he thong', {
          description: 'Loi may chu noi bo. Vui long thu lai sau.',
        });
        break;

      default:
        toast.error('Da xay ra loi', {
          description: data?.message || error.message,
        });
    }

    return Promise.reject(error);
  }
);
```

### 6.2 Loading States

Every data-loading component MUST show an appropriate loading state. No blank screens. No frozen UI.

| Component Type | Loading Implementation |
|---|---|
| **DataTable** | Skeleton rows (5 rows, animated pulse). Use `isLoading` prop on `DataTable`. |
| **StatCards** | Skeleton card with matching height. Use `Skeleton` from shadcn/ui. |
| **Forms** | All inputs disabled. Submit button shows `Loader2` spinner. |
| **Charts (ECharts)** | Gray rectangular skeleton with shimmer. Same dimensions as chart. |
| **Map** | Full-area centered spinner with "Dang tai ban do..." text. |
| **Detail Pages** | Full-page skeleton matching the layout structure. |
| **Buttons (mutation)** | Show `Loader2` spinner, disable button, keep text visible. |

```tsx
// Example: Card loading skeleton
function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

// Example: Chart loading skeleton
function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      className="animate-pulse rounded-lg bg-muted"
      style={{ height }}
    />
  );
}
```

### 6.3 Empty States

Every page and every list view MUST have a meaningful empty state. No blank tables. No empty white areas.

| Page | Icon | Title | Description | Action |
|------|------|-------|-------------|--------|
| Vehicles | `Car` | Chua co phuong tien | Bat dau bang cach them phuong tien dau tien | Them phuong tien |
| Devices | `Cpu` | Chua co thiet bi | Them thiet bi GPS/OBD2 de bat dau theo doi | Them thiet bi |
| Customers | `Users` | Chua co khach hang | Them khach hang de quan ly doi xe | Them khach hang |
| Alerts | `Bell` | Khong co canh bao | He thong dang hoat dong binh thuong | (none) |
| Trips | `Route` | Chua co chuyen di | Cac chuyen di se tu dong ghi nhan khi xe di chuyen | (none) |
| Geofences | `MapPin` | Chua co vung dia ly | Tao vung dia ly de nhan canh bao khi xe ra/vao | Tao vung |
| Maintenance | `Wrench` | Chua co lich bao tri | Len lich bao tri dinh ky cho phuong tien | Them lich bao tri |
| Firmware | `HardDrive` | Chua co firmware | Tai len phien ban firmware dau tien | Tai len |
| Users | `UserPlus` | Chua co nguoi dung | Them nguoi dung de phan quyen truy cap | Them nguoi dung |
| Notifications | `BellOff` | Khong co thong bao | Ban da doc tat ca thong bao | (none) |

```tsx
// Usage example in a page:
<DataTable
  columns={columns}
  data={data ?? []}
  searchKey="name"
  isLoading={isLoading}
  emptyIcon={<Cpu className="h-12 w-12" />}
  emptyTitle="Chua co thiet bi"
  emptyDescription="Them thiet bi GPS/OBD2 de bat dau theo doi"
  emptyAction={{
    label: 'Them thiet bi',
    onClick: () => setCreateOpen(true),
  }}
/>
```

### 6.4 Error Boundary

```tsx
// components/error-boundary.tsx
'use client';

import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
            <h2 className="mb-2 text-lg font-semibold">Da xay ra loi</h2>
            <p className="mb-4 max-w-md text-sm text-muted-foreground">
              {this.state.error?.message || 'Loi khong xac dinh'}
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
            >
              Thu lai
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

---

## 7. Implementation Phases

### Phase 4A: Foundation + Auth (FE-001 to FE-007)

| Step | Task | File(s) | Details |
|------|------|---------|---------|
| 1 | Install shadcn/ui components | `components/ui/` | button, input, dialog, table, card, badge, dropdown-menu, form, select, skeleton, toast, alert-dialog, tabs, sheet, slider, switch, tooltip, breadcrumb, separator, avatar, popover, calendar, checkbox, command |
| 2 | Create page-container | `components/layout/page-container.tsx` | Title, description, breadcrumbs, header action slot |
| 3 | Create app-sidebar | `components/layout/app-sidebar.tsx` | Navigation links, user info, collapsible, mobile responsive |
| 4 | Create site-header | `components/layout/site-header.tsx` | Connection status, notification badge, user dropdown, theme toggle |
| 5 | Create login page | `app/login/page.tsx` | Email + password form, Zod validation, error display, redirect on success |
| 6 | Create auth store | `lib/store/auth-store.ts` | Zustand store: token (memory only), user profile, login/logout actions |
| 7 | Create API client | `lib/api/client.ts` | Axios instance with auth interceptor, error interceptor (Section 6.1) |
| 8 | Create middleware | `middleware.ts` | Route protection: redirect unauthenticated to /login, redirect authenticated from /login to /dashboard |
| 9 | Create providers | `components/providers/` | QueryClientProvider (TanStack Query), ThemeProvider (next-themes), SocketProvider, Toaster (Sonner) |
| 10 | Create shared components | `components/common/` | DataTable, EmptyState, ConfirmDialog, StatCard (as specified in Section 3) |

### Phase 4B: Device UI (FE-010 to FE-017)

| Step | Task | File(s) | Details |
|------|------|---------|---------|
| 1 | Device API service | `lib/api/devices.ts` | CRUD + sessions + telemetry + commands endpoints |
| 2 | Device Zod schema | `lib/validations/device.schema.ts` | All device fields with Vietnamese error messages |
| 3 | Device columns | `features/devices/components/device-columns.tsx` | Name, serial, status badge, customer, last seen, actions dropdown |
| 4 | Device form | `features/devices/components/device-form.tsx` | Dialog with all fields, create/edit mode |
| 5 | Device hooks | `features/devices/hooks/` | `use-devices.ts`, `use-device.ts`, `use-create-device.ts`, `use-update-device.ts`, `use-delete-device.ts` |
| 6 | Device page | `app/(dashboard)/devices/page.tsx` | Full CRUD following Section 1.1 pattern |
| 7 | Device detail page | `app/(dashboard)/devices/[id]/page.tsx` | Tabbed layout: Overview, Sessions, Telemetry, Errors, Commands |
| 8 | Telemetry tab | `features/devices/components/telemetry-tab.tsx` | Real-time stat cards + ECharts history chart |
| 9 | Sessions tab | `features/devices/components/sessions-tab.tsx` | DataTable of connection sessions with duration |
| 10 | Device realtime hook | `features/devices/hooks/use-device-realtime.ts` | Status + telemetry socket events |

### Phase 4C: Support Pages (FE-020 to FE-026)

| Step | Task | File(s) | Details |
|------|------|---------|---------|
| 1 | Dashboard stat cards | `app/(dashboard)/dashboard/page.tsx` | 4 StatCards: Total vehicles, Active devices, Active alerts, Total trips. ALL from real API, no hardcoded values |
| 2 | Dashboard charts | `features/dashboard/components/` | Activity chart (ECharts line), Device status pie, Alert trend bar. ALL from real API |
| 3 | Dashboard activity feed | `features/dashboard/components/activity-feed.tsx` | Recent events list from API, with timestamps and icons |
| 4 | Settings: Profile tab | `app/(dashboard)/settings/page.tsx` | Editable profile form, avatar upload, connected to `PUT /users/profile` |
| 5 | Settings: Password tab | Same file | Password change dialog, current password verification, strength indicator |
| 6 | Settings: Notifications tab | Same file | Toggle switches for email, telegram, SMS alerts, connected to API |
| 7 | Settings: Appearance tab | Same file | Theme toggle (light/dark/system) via next-themes |
| 8 | Firmware page | `app/(dashboard)/firmware/page.tsx` | DataTable + upload dialog + activate/deactivate + assign to devices + delete |
| 9 | User management | `app/(dashboard)/users/page.tsx` | Full CRUD with role selection (admin/operator/viewer), reset password action |
| 10 | Export page | `app/(dashboard)/exports/page.tsx` | Create export job (date range + type), list jobs with status, download completed |

### Phase 4D: Vehicle + Customer (FE-030 to FE-037)

| Step | Task | File(s) | Details |
|------|------|---------|---------|
| 1 | Vehicle API + schema | `lib/api/vehicles.ts`, `lib/validations/vehicle.schema.ts` | CRUD + device assignment + trip history |
| 2 | Vehicle columns + form | `features/vehicles/components/` | Plate number, brand, type, customer, status badge, device assignment, actions |
| 3 | Vehicle hooks | `features/vehicles/hooks/` | Full CRUD hooks following Section 1.4 |
| 4 | Vehicle page | `app/(dashboard)/vehicles/page.tsx` | DataTable with search by plate number |
| 5 | Vehicle detail page | `app/(dashboard)/vehicles/[id]/page.tsx` | Tabs: Overview (info + assigned device), Trip history (DataTable), Maintenance history |
| 6 | Customer API + schema | `lib/api/customers.ts`, `lib/validations/customer.schema.ts` | CRUD + fleet overview |
| 7 | Customer columns + form | `features/customers/components/` | Name, contact, vehicle count, status, actions |
| 8 | Customer page | `app/(dashboard)/customers/page.tsx` | DataTable with search |
| 9 | Customer detail page | `app/(dashboard)/customers/[id]/page.tsx` | Overview + fleet list (vehicles belonging to this customer) |

### Phase 5A: Map + Geofence (FE-040 to FE-047)

| Step | Task | File(s) | Details |
|------|------|---------|---------|
| 1 | Map dynamic import wrapper | `components/map/map-container.tsx` | SSR-safe `next/dynamic` with `ssr: false` (Section 4.1) |
| 2 | Map view base | `components/map/map-view.tsx` | Leaflet MapContainer + TileLayer, HCMC default center |
| 3 | Vehicle markers | `components/map/vehicle-marker.tsx` | Custom divIcon with real GPS data (Section 4.2) |
| 4 | Device locations API | `lib/api/dashboard.ts` | `GET /api/v1/dashboard/device-locations` returning real positions from VictoriaMetrics |
| 5 | Map page | `app/(dashboard)/map/page.tsx` | Full map with sidebar: vehicle list tab + geofence list tab |
| 6 | Map sidebar | `features/map/components/map-sidebar.tsx` | Searchable list of vehicles with status indicators, click to center on map |
| 7 | Geofence layers | `components/map/geofence-layer.tsx` | Render circles and polygons from API data |
| 8 | Device locations realtime | `features/map/hooks/use-device-locations-realtime.ts` | Socket updates for marker positions (Section 5.4) |
| 9 | Geofence management page | `app/(dashboard)/geofences/page.tsx` | DataTable with CRUD |
| 10 | Geofence create/edit | `features/geofences/components/geofence-form.tsx` | Form with embedded Leaflet.Draw map editor (Section 4.3) |
| 11 | Geofence detail page | `app/(dashboard)/geofences/[id]/page.tsx` | Map preview + assigned vehicles + violation history |

### Phase 5B: Alerts + Trips + Maintenance (FE-050 to FE-060)

| Step | Task | File(s) | Details |
|------|------|---------|---------|
| 1 | Alert API + hooks | `lib/api/alerts.ts`, `features/alerts/hooks/` | List, acknowledge, resolve, detail |
| 2 | Alert columns | `features/alerts/components/alert-columns.tsx` | Severity badge (critical=red, warning=yellow, info=blue), device, timestamp, status, actions |
| 3 | Alert page | `app/(dashboard)/alerts/page.tsx` | DataTable + filter by severity/status + acknowledge/resolve mutations with toast feedback |
| 4 | Alert detail dialog | `features/alerts/components/alert-detail.tsx` | Full alert info + device link + map location + resolution form |
| 5 | Alert stream hook | `features/alerts/hooks/use-alert-stream.ts` | Real-time new alerts with toast (Section 5.5) |
| 6 | Trip API + hooks | `lib/api/trips.ts`, `features/trips/hooks/` | List, detail, route points |
| 7 | Trip page | `app/(dashboard)/trips/page.tsx` | DataTable with date range filter, vehicle filter |
| 8 | Trip detail page | `app/(dashboard)/trips/[id]/page.tsx` | Split layout: trip info card (left) + route map with replay (right) |
| 9 | Trip replay component | `components/map/trip-replay.tsx` | Speed-colored polyline + playback controls (Section 4.4) |
| 10 | Maintenance API + hooks | `lib/api/maintenance.ts`, `features/maintenance/hooks/` | CRUD + forecast |
| 11 | Maintenance page | `app/(dashboard)/maintenance/page.tsx` | DataTable view + calendar view toggle |
| 12 | Maintenance form | `features/maintenance/components/maintenance-form.tsx` | Service type, date, odometer, cost, notes, vehicle select |
| 13 | Maintenance calendar | `features/maintenance/components/maintenance-calendar.tsx` | Monthly calendar with scheduled maintenance dots |

### Phase 5C: Real-time Integration (FE-070 to FE-075)

| Step | Task | File(s) | Details |
|------|------|---------|---------|
| 1 | Socket provider | `components/providers/socket-provider.tsx` | Full implementation (Section 5.1) |
| 2 | Add SocketProvider to layout | `app/(dashboard)/layout.tsx` | Wrap dashboard layout with SocketProvider inside QueryClientProvider |
| 3 | Device locations realtime | `features/map/hooks/use-device-locations-realtime.ts` | Map marker updates (already defined in Phase 5A) |
| 4 | Alert stream | `features/alerts/hooks/use-alert-stream.ts` | Toast on new alerts (already defined in Phase 5B) |
| 5 | Dashboard stats realtime | `features/dashboard/hooks/use-dashboard-realtime.ts` | Invalidate stat queries on `stats.updated` |
| 6 | Firmware progress | `features/firmware/hooks/use-firmware-realtime.ts` | Progress bar updates via `firmware.progress` |
| 7 | Notification badge | `features/notifications/hooks/use-notification-realtime.ts` | Increment unread count on `notification.new`, show toast |
| 8 | Connection status | `components/layout/connection-status.tsx` | Green/red indicator in header (Section 5.6) |

### Phase 5D: Reports + Notifications (FE-080 to FE-085)

| Step | Task | File(s) | Details |
|------|------|---------|---------|
| 1 | Notification API + hooks | `lib/api/notifications.ts`, `features/notifications/hooks/` | List, mark read, mark all read, delete |
| 2 | Notifications page | `app/(dashboard)/notifications/page.tsx` | List with read/unread filter, mark all read button, click to mark individual |
| 3 | Notification dropdown | `components/layout/notification-dropdown.tsx` | Bell icon in header with unread count badge, dropdown with recent 5 notifications, "Xem tat ca" link |
| 4 | System admin: Health | `app/(dashboard)/system-admin/page.tsx` | StatCards for each service status (PostgreSQL, EMQX, VictoriaMetrics, VictoriaLogs) |
| 5 | System admin: Metrics | `app/(dashboard)/system-admin/metrics/page.tsx` | PromQL input + ECharts time-series chart + preset queries dropdown |
| 6 | System admin: Logs | `app/(dashboard)/system-admin/logs/page.tsx` | LogsQL input + scrollable log list + severity filter + time range |
| 7 | Violations page | `app/(dashboard)/violations/page.tsx` | DataTable of geofence violations with alert link, device link, map preview |

---

## 8. Zod Validation Schemas Reference

Every form MUST use a Zod schema. No raw form state. No unvalidated submissions.

### 8.1 Vehicle Schema

```typescript
// lib/validations/vehicle.schema.ts
import { z } from 'zod';

export const vehicleSchema = z.object({
  vehicleId: z
    .string()
    .min(1, 'Ma xe la bat buoc')
    .max(50, 'Ma xe toi da 50 ky tu')
    .regex(/^[A-Za-z0-9_-]+$/, 'Ma xe chi chua chu, so, gach ngang'),
  plateNumber: z
    .string()
    .min(1, 'Bien so la bat buoc')
    .max(20, 'Bien so toi da 20 ky tu'),
  brand: z.string().min(1, 'Hang xe la bat buoc'),
  model: z.string().optional(),
  vehicleType: z.enum(['car', 'truck', 'motorcycle', 'bus', 'van'], {
    required_error: 'Loai xe la bat buoc',
  }),
  color: z.string().optional(),
  year: z
    .number()
    .min(1990, 'Nam san xuat tu 1990')
    .max(new Date().getFullYear() + 1, 'Nam san xuat khong hop le')
    .optional(),
  status: z.enum(['active', 'inactive', 'maintenance'], {
    required_error: 'Trang thai la bat buoc',
  }),
  customerId: z.number().optional(),
  notes: z.string().max(500, 'Ghi chu toi da 500 ky tu').optional(),
});

export type VehicleFormValues = z.infer<typeof vehicleSchema>;
```

### 8.2 Device Schema

```typescript
// lib/validations/device.schema.ts
import { z } from 'zod';

export const deviceSchema = z.object({
  serialNumber: z
    .string()
    .min(1, 'So serial la bat buoc')
    .max(100, 'So serial toi da 100 ky tu'),
  name: z
    .string()
    .min(1, 'Ten thiet bi la bat buoc')
    .max(100, 'Ten toi da 100 ky tu'),
  deviceType: z.enum(['gps_tracker', 'obd2', 'combo'], {
    required_error: 'Loai thiet bi la bat buoc',
  }),
  firmwareVersion: z.string().optional(),
  simNumber: z
    .string()
    .regex(/^[0-9+\-\s]*$/, 'So SIM khong hop le')
    .optional(),
  vehicleId: z.number().optional(),
  notes: z.string().max(500, 'Ghi chu toi da 500 ky tu').optional(),
});

export type DeviceFormValues = z.infer<typeof deviceSchema>;
```

### 8.3 Customer Schema

```typescript
// lib/validations/customer.schema.ts
import { z } from 'zod';

export const customerSchema = z.object({
  name: z
    .string()
    .min(1, 'Ten khach hang la bat buoc')
    .max(200, 'Ten toi da 200 ky tu'),
  contactPerson: z.string().min(1, 'Nguoi lien he la bat buoc'),
  email: z.string().email('Email khong hop le').optional().or(z.literal('')),
  phone: z
    .string()
    .min(1, 'So dien thoai la bat buoc')
    .regex(/^[0-9+\-\s()]+$/, 'So dien thoai khong hop le'),
  address: z.string().optional(),
  taxCode: z.string().optional(),
  status: z.enum(['active', 'inactive'], {
    required_error: 'Trang thai la bat buoc',
  }),
  notes: z.string().max(500, 'Ghi chu toi da 500 ky tu').optional(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
```

### 8.4 Geofence Schema

```typescript
// lib/validations/geofence.schema.ts
import { z } from 'zod';

export const geofenceSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Ten vung la bat buoc')
      .max(100, 'Ten toi da 100 ky tu'),
    type: z.enum(['circle', 'polygon'], {
      required_error: 'Loai vung la bat buoc',
    }),
    // Circle fields
    centerLatitude: z.number().min(-90).max(90).optional(),
    centerLongitude: z.number().min(-180).max(180).optional(),
    radiusMeters: z.number().min(50, 'Ban kinh toi thieu 50m').max(50000, 'Ban kinh toi da 50km').optional(),
    // Polygon fields
    coordinates: z
      .array(z.tuple([z.number(), z.number()]))
      .min(3, 'Can it nhat 3 diem')
      .optional(),
    // Common
    alertOnEntry: z.boolean().default(true),
    alertOnExit: z.boolean().default(true),
    status: z.enum(['active', 'inactive']).default('active'),
    notes: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'circle') {
        return (
          data.centerLatitude !== undefined &&
          data.centerLongitude !== undefined &&
          data.radiusMeters !== undefined
        );
      }
      return true;
    },
    { message: 'Vung tron can co toa do tam va ban kinh', path: ['centerLatitude'] }
  )
  .refine(
    (data) => {
      if (data.type === 'polygon') {
        return data.coordinates && data.coordinates.length >= 3;
      }
      return true;
    },
    { message: 'Vung da giac can it nhat 3 diem', path: ['coordinates'] }
  );

export type GeofenceFormValues = z.infer<typeof geofenceSchema>;
```

### 8.5 Login Schema

```typescript
// lib/validations/login.schema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email la bat buoc')
    .email('Email khong hop le'),
  password: z
    .string()
    .min(1, 'Mat khau la bat buoc')
    .min(6, 'Mat khau it nhat 6 ky tu'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
```

### 8.6 Password Change Schema

```typescript
// lib/validations/password.schema.ts
import { z } from 'zod';

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Nhap mat khau hien tai'),
    newPassword: z
      .string()
      .min(8, 'Mat khau moi it nhat 8 ky tu')
      .regex(/[A-Z]/, 'Can it nhat 1 chu hoa')
      .regex(/[a-z]/, 'Can it nhat 1 chu thuong')
      .regex(/[0-9]/, 'Can it nhat 1 so')
      .regex(/[^A-Za-z0-9]/, 'Can it nhat 1 ky tu dac biet'),
    confirmPassword: z.string().min(1, 'Xac nhan mat khau moi'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mat khau xac nhan khong khop',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Mat khau moi phai khac mat khau hien tai',
    path: ['newPassword'],
  });

export type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;
```

### 8.7 User Schema (Admin)

```typescript
// lib/validations/user.schema.ts
import { z } from 'zod';

export const userSchema = z.object({
  email: z.string().email('Email khong hop le'),
  fullName: z
    .string()
    .min(1, 'Ho ten la bat buoc')
    .max(100, 'Ho ten toi da 100 ky tu'),
  role: z.enum(['admin', 'operator', 'viewer'], {
    required_error: 'Vai tro la bat buoc',
  }),
  status: z.enum(['active', 'inactive']).default('active'),
  phone: z
    .string()
    .regex(/^[0-9+\-\s()]*$/, 'So dien thoai khong hop le')
    .optional()
    .or(z.literal('')),
});

export type UserFormValues = z.infer<typeof userSchema>;
```

### 8.8 Maintenance Schema

```typescript
// lib/validations/maintenance.schema.ts
import { z } from 'zod';

export const maintenanceSchema = z.object({
  vehicleId: z.number({ required_error: 'Phuong tien la bat buoc' }),
  serviceType: z.enum(
    ['oil_change', 'tire_rotation', 'brake_inspection', 'general_service', 'engine_repair', 'battery_replacement', 'other'],
    { required_error: 'Loai dich vu la bat buoc' }
  ),
  scheduledDate: z.string().min(1, 'Ngay hen la bat buoc'),
  completedDate: z.string().optional(),
  odometerKm: z.number().min(0, 'So km khong hop le').optional(),
  cost: z.number().min(0, 'Chi phi khong hop le').optional(),
  vendor: z.string().max(200).optional(),
  notes: z.string().max(1000, 'Ghi chu toi da 1000 ky tu').optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).default('scheduled'),
});

export type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;
```

### 8.9 Profile Schema

```typescript
// lib/validations/profile.schema.ts
import { z } from 'zod';

export const profileSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Ho ten la bat buoc')
    .max(100, 'Ho ten toi da 100 ky tu'),
  phone: z
    .string()
    .regex(/^[0-9+\-\s()]*$/, 'So dien thoai khong hop le')
    .optional()
    .or(z.literal('')),
  timezone: z.string().optional(),
  language: z.enum(['vi', 'en']).default('vi'),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
```

---

## 9. Auth Store (Zustand)

```typescript
// lib/store/auth-store.ts
import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';

interface User {
  id: number;
  email: string;
  fullName: string;
  role: 'admin' | 'operator' | 'viewer';
  avatarUrl?: string;
}

interface AuthState {
  token: string | null;       // In memory ONLY - never persisted to localStorage
  user: User | null;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  login: async (email, password) => {
    const response = await apiClient.post('/api/v1/auth/login', {
      email,
      password,
    });
    const { token, user } = response.data;
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    const token = get().token;
    if (token) {
      // Fire-and-forget logout API call
      apiClient
        .post('/api/v1/auth/logout')
        .catch(() => {});
    }
    set({ token: null, user: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),

  refreshProfile: async () => {
    try {
      const response = await apiClient.get('/api/v1/users/profile');
      set({ user: response.data });
    } catch {
      // If profile fetch fails, do not crash
    }
  },
}));
```

**CRITICAL**: Token is stored in Zustand memory ONLY. It is NOT persisted to localStorage. On page refresh, the user must re-authenticate. This is the security requirement from `23-backend-security.md`.

---

## 10. Verification Checklist (Per Page)

For EVERY page implemented, the agent MUST verify all of the following before marking the task as complete:

| # | Check | Required |
|---|-------|----------|
| 1 | Uses `PageContainer` with `pageTitle` and `pageDescription` | YES |
| 2 | Uses `DataTable` for all list/table views (not hand-rolled `<table>`) | YES |
| 3 | Uses `Dialog` or `Sheet` from shadcn/ui for modals (not custom modal divs) | YES |
| 4 | Uses `Form` + `FormField` from shadcn/ui for forms (not bare `<input>`) | YES |
| 5 | Has a Zod validation schema in `lib/validations/` | YES |
| 6 | Has TanStack Query hooks in `features/{name}/hooks/` (not raw fetch/axios) | YES |
| 7 | Has loading state using `Skeleton` components | YES |
| 8 | Has empty state using `EmptyState` component with icon + title + description + action | YES |
| 9 | Has error handling via toast (Sonner) in all mutations | YES |
| 10 | Has proper TypeScript types (no `any` in component props, no untyped API responses) | YES |
| 11 | ZERO instances of "Coming Soon", "TODO", "placeholder", or deferred text | YES |
| 12 | Connected to real API endpoints OR documented as pending in `.tracking/CURRENT_TASKS.md` | YES |
| 13 | All user-facing text in Vietnamese (not English placeholders) | YES |
| 14 | All mutations show loading spinner on submit button | YES |
| 15 | Delete operations use `ConfirmDialog` with destructive variant | YES |
| 16 | Form resets after successful create/update | YES |
| 17 | No `console.log` in production code (only in socket/debug utilities) | YES |

### Self-Check Command

After implementing each page, mentally walk through:

1. Open the page -- does it show a loading skeleton?
2. Data loads -- does the DataTable render correctly?
3. No data -- does the EmptyState show with an action button?
4. Click "Them moi" -- does the form dialog open with empty fields?
5. Submit empty form -- do Zod validation errors appear in Vietnamese?
6. Fill and submit -- does the mutation fire with a spinner?
7. Success -- does the toast appear and the dialog close?
8. Error -- does the error toast appear?
9. Click edit on a row -- does the form populate with existing data?
10. Click delete on a row -- does the ConfirmDialog appear?
11. Confirm delete -- does the mutation fire and the row disappear?
12. Check the network tab -- are all API calls going to the correct endpoints?

---

## 11. File Structure Summary

```
Tracking_Frontend/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # Dashboard layout with sidebar + header + providers
│   │   ├── dashboard/
│   │   │   └── page.tsx                  # Dashboard home: stats + charts + feed
│   │   ├── map/
│   │   │   └── page.tsx                  # Live map: vehicle markers + geofence layers
│   │   ├── vehicles/
│   │   │   ├── page.tsx                  # Vehicle list: DataTable + CRUD
│   │   │   └── [id]/page.tsx             # Vehicle detail: tabs (overview, trips, maintenance)
│   │   ├── devices/
│   │   │   ├── page.tsx                  # Device list: DataTable + CRUD
│   │   │   └── [id]/page.tsx             # Device detail: tabs (overview, sessions, telemetry, errors)
│   │   ├── customers/
│   │   │   ├── page.tsx                  # Customer list: DataTable + CRUD
│   │   │   └── [id]/page.tsx             # Customer detail: overview + fleet
│   │   ├── trips/
│   │   │   ├── page.tsx                  # Trip list: DataTable + date filter
│   │   │   └── [id]/page.tsx             # Trip detail: info + route map + replay
│   │   ├── alerts/
│   │   │   └── page.tsx                  # Alert list: DataTable + acknowledge/resolve
│   │   ├── geofences/
│   │   │   ├── page.tsx                  # Geofence list: DataTable + CRUD
│   │   │   └── [id]/page.tsx             # Geofence detail: map preview + violations
│   │   ├── maintenance/
│   │   │   └── page.tsx                  # Maintenance: DataTable + calendar view
│   │   ├── firmware/
│   │   │   └── page.tsx                  # Firmware: upload + list + activate + assign
│   │   ├── users/
│   │   │   └── page.tsx                  # User management: CRUD + role + reset password
│   │   ├── notifications/
│   │   │   └── page.tsx                  # Notification center: list + mark read
│   │   ├── violations/
│   │   │   └── page.tsx                  # Geofence violations: DataTable
│   │   ├── exports/
│   │   │   └── page.tsx                  # Export jobs: create + list + download
│   │   ├── settings/
│   │   │   └── page.tsx                  # Settings: profile, password, notifications, appearance
│   │   └── system-admin/
│   │       ├── page.tsx                  # System health: service status cards
│   │       ├── metrics/page.tsx          # PromQL query + chart
│   │       └── logs/page.tsx             # LogsQL query + log list
│   ├── login/
│   │   └── page.tsx                      # Login form
│   ├── layout.tsx                        # Root layout
│   └── middleware.ts                     # Auth route protection
│
├── components/
│   ├── common/
│   │   ├── data-table.tsx                # DataTable wrapper (Section 2.1)
│   │   ├── data-table-column-header.tsx  # Sortable column header (Section 2.2)
│   │   ├── confirm-dialog.tsx            # Delete/action confirmation (Section 3.1)
│   │   ├── empty-state.tsx               # Empty data state (Section 3.2)
│   │   └── stat-card.tsx                 # Dashboard stat card (Section 3.3)
│   ├── layout/
│   │   ├── app-sidebar.tsx               # Navigation sidebar
│   │   ├── site-header.tsx               # Top header bar
│   │   ├── page-container.tsx            # Page wrapper (Section 3.4)
│   │   ├── connection-status.tsx         # Socket status indicator (Section 5.6)
│   │   └── notification-dropdown.tsx     # Header notification bell
│   ├── map/
│   │   ├── map-container.tsx             # SSR-safe dynamic import (Section 4.1)
│   │   ├── map-view.tsx                  # Base Leaflet map
│   │   ├── vehicle-marker.tsx            # Custom vehicle icon (Section 4.2)
│   │   ├── geofence-editor.tsx           # Leaflet.Draw editor (Section 4.3)
│   │   ├── geofence-layer.tsx            # Render geofence shapes
│   │   ├── trip-replay.tsx               # Playback controls (Section 4.4)
│   │   └── speed-legend.tsx              # Speed color legend (Section 4.5)
│   ├── providers/
│   │   ├── query-provider.tsx            # TanStack QueryClientProvider
│   │   ├── theme-provider.tsx            # next-themes ThemeProvider
│   │   └── socket-provider.tsx           # Socket.IO provider (Section 5.1)
│   ├── ui/                               # shadcn/ui components (auto-generated)
│   └── error-boundary.tsx                # Error boundary (Section 6.4)
│
├── features/
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── activity-chart.tsx        # ECharts line chart
│   │   │   ├── device-status-chart.tsx   # ECharts pie chart
│   │   │   ├── alert-trend-chart.tsx     # ECharts bar chart
│   │   │   └── activity-feed.tsx         # Recent events list
│   │   └── hooks/
│   │       ├── use-dashboard-stats.ts    # Stats query
│   │       └── use-dashboard-realtime.ts # Realtime stats
│   ├── vehicles/
│   │   ├── components/
│   │   │   ├── vehicle-columns.tsx
│   │   │   └── vehicle-form.tsx
│   │   └── hooks/
│   │       ├── use-vehicles.ts
│   │       ├── use-vehicle.ts
│   │       ├── use-create-vehicle.ts
│   │       ├── use-update-vehicle.ts
│   │       └── use-delete-vehicle.ts
│   ├── devices/
│   │   ├── components/
│   │   │   ├── device-columns.tsx
│   │   │   ├── device-form.tsx
│   │   │   ├── telemetry-tab.tsx
│   │   │   ├── sessions-tab.tsx
│   │   │   └── errors-tab.tsx
│   │   └── hooks/
│   │       ├── use-devices.ts
│   │       ├── use-device.ts
│   │       ├── use-create-device.ts
│   │       ├── use-update-device.ts
│   │       ├── use-delete-device.ts
│   │       └── use-device-realtime.ts
│   ├── customers/
│   │   ├── components/
│   │   │   ├── customer-columns.tsx
│   │   │   └── customer-form.tsx
│   │   └── hooks/
│   │       ├── use-customers.ts
│   │       ├── use-customer.ts
│   │       ├── use-create-customer.ts
│   │       ├── use-update-customer.ts
│   │       └── use-delete-customer.ts
│   ├── trips/
│   │   ├── components/
│   │   │   ├── trip-columns.tsx
│   │   │   ├── trip-info.tsx
│   │   │   └── trip-route-map.tsx
│   │   └── hooks/
│   │       ├── use-trips.ts
│   │       ├── use-trip.ts
│   │       └── use-trip-route.ts
│   ├── alerts/
│   │   ├── components/
│   │   │   ├── alert-columns.tsx
│   │   │   └── alert-detail.tsx
│   │   └── hooks/
│   │       ├── use-alerts.ts
│   │       ├── use-acknowledge-alert.ts
│   │       ├── use-resolve-alert.ts
│   │       └── use-alert-stream.ts
│   ├── geofences/
│   │   ├── components/
│   │   │   ├── geofence-columns.tsx
│   │   │   └── geofence-form.tsx
│   │   └── hooks/
│   │       ├── use-geofences.ts
│   │       ├── use-geofence.ts
│   │       ├── use-create-geofence.ts
│   │       ├── use-update-geofence.ts
│   │       └── use-delete-geofence.ts
│   ├── maintenance/
│   │   ├── components/
│   │   │   ├── maintenance-columns.tsx
│   │   │   ├── maintenance-form.tsx
│   │   │   └── maintenance-calendar.tsx
│   │   └── hooks/
│   │       ├── use-maintenance-list.ts
│   │       ├── use-create-maintenance.ts
│   │       ├── use-update-maintenance.ts
│   │       └── use-delete-maintenance.ts
│   ├── firmware/
│   │   ├── components/
│   │   │   ├── firmware-columns.tsx
│   │   │   ├── firmware-upload-dialog.tsx
│   │   │   └── firmware-assign-dialog.tsx
│   │   └── hooks/
│   │       ├── use-firmware-list.ts
│   │       ├── use-upload-firmware.ts
│   │       ├── use-activate-firmware.ts
│   │       ├── use-assign-firmware.ts
│   │       └── use-firmware-realtime.ts
│   ├── users/
│   │   ├── components/
│   │   │   ├── user-columns.tsx
│   │   │   └── user-form.tsx
│   │   └── hooks/
│   │       ├── use-users.ts
│   │       ├── use-create-user.ts
│   │       ├── use-update-user.ts
│   │       ├── use-delete-user.ts
│   │       └── use-reset-password.ts
│   ├── notifications/
│   │   ├── components/
│   │   │   └── notification-list.tsx
│   │   └── hooks/
│   │       ├── use-notifications.ts
│   │       ├── use-mark-read.ts
│   │       ├── use-mark-all-read.ts
│   │       └── use-notification-realtime.ts
│   ├── map/
│   │   ├── components/
│   │   │   └── map-sidebar.tsx
│   │   └── hooks/
│   │       ├── use-device-locations.ts
│   │       └── use-device-locations-realtime.ts
│   └── settings/
│       ├── components/
│       │   ├── profile-form.tsx
│       │   ├── password-change-dialog.tsx
│       │   ├── notification-settings.tsx
│       │   └── appearance-settings.tsx
│       └── hooks/
│           ├── use-profile.ts
│           ├── use-update-profile.ts
│           ├── use-change-password.ts
│           └── use-notification-settings.ts
│
├── lib/
│   ├── api/
│   │   ├── client.ts                     # Axios instance (Section 6.1)
│   │   ├── vehicles.ts                   # Vehicle API service
│   │   ├── devices.ts                    # Device API service
│   │   ├── customers.ts                  # Customer API service
│   │   ├── trips.ts                      # Trip API service
│   │   ├── alerts.ts                     # Alert API service
│   │   ├── geofences.ts                  # Geofence API service
│   │   ├── maintenance.ts               # Maintenance API service
│   │   ├── firmware.ts                   # Firmware API service
│   │   ├── users.ts                      # User management API service
│   │   ├── notifications.ts             # Notification API service
│   │   ├── dashboard.ts                  # Dashboard API service
│   │   ├── exports.ts                    # Export API service
│   │   └── system-admin.ts              # System admin API service
│   ├── store/
│   │   └── auth-store.ts                 # Zustand auth store (Section 9)
│   ├── validations/
│   │   ├── vehicle.schema.ts             # Vehicle Zod schema
│   │   ├── device.schema.ts              # Device Zod schema
│   │   ├── customer.schema.ts            # Customer Zod schema
│   │   ├── geofence.schema.ts            # Geofence Zod schema
│   │   ├── maintenance.schema.ts         # Maintenance Zod schema
│   │   ├── user.schema.ts                # User Zod schema
│   │   ├── profile.schema.ts             # Profile Zod schema
│   │   ├── password.schema.ts            # Password change Zod schema
│   │   └── login.schema.ts               # Login Zod schema
│   └── utils.ts                          # cn() utility, formatters
│
└── types/
    ├── vehicle.ts                        # Vehicle types
    ├── device.ts                         # Device types
    ├── customer.ts                       # Customer types
    ├── trip.ts                           # Trip types
    ├── alert.ts                          # Alert types
    ├── geofence.ts                       # Geofence types
    ├── maintenance.ts                    # Maintenance types
    ├── firmware.ts                       # Firmware types
    ├── user.ts                           # User types
    ├── notification.ts                   # Notification types
    └── api.ts                            # API response wrapper types
```

---

## 12. Backend API Dependencies

### Required API Endpoints (by Phase)

| Phase | Endpoint | Method | Priority |
|-------|----------|--------|----------|
| 4A | `POST /api/v1/auth/login` | POST | CRITICAL |
| 4A | `POST /api/v1/auth/logout` | POST | CRITICAL |
| 4A | `GET /api/v1/users/profile` | GET | CRITICAL |
| 4B | `GET /api/v1/devices` | GET | CRITICAL |
| 4B | `GET /api/v1/devices/:id` | GET | CRITICAL |
| 4B | `POST /api/v1/devices` | POST | CRITICAL |
| 4B | `PUT /api/v1/devices/:id` | PUT | CRITICAL |
| 4B | `DELETE /api/v1/devices/:id` | DELETE | CRITICAL |
| 4B | `GET /api/v1/devices/:id/sessions` | GET | HIGH |
| 4B | `GET /api/v1/devices/:id/telemetry` | GET | HIGH |
| 4C | `GET /api/v1/dashboard/stats` | GET | CRITICAL |
| 4C | `GET /api/v1/dashboard/activity-chart` | GET | CRITICAL |
| 4C | `GET /api/v1/dashboard/device-locations` | GET | CRITICAL |
| 4C | `PUT /api/v1/users/profile` | PUT | HIGH |
| 4C | `PUT /api/v1/auth/change-password` | PUT | HIGH |
| 4C | `GET /api/v1/users/notification-settings` | GET | HIGH |
| 4C | `PUT /api/v1/users/notification-settings` | PUT | HIGH |
| 4C | `GET/POST/PUT/DELETE /api/v1/firmware/*` | ALL | HIGH |
| 4C | `GET/POST/PUT/DELETE /api/v1/users` | ALL | HIGH |
| 4D | `GET/POST/PUT/DELETE /api/v1/vehicles` | ALL | CRITICAL |
| 4D | `GET/POST/PUT/DELETE /api/v1/customers` | ALL | CRITICAL |
| 5A | `GET/POST/PUT/DELETE /api/v1/geofences` | ALL | HIGH |
| 5B | `GET /api/v1/alerts` | GET | HIGH |
| 5B | `PUT /api/v1/alerts/:id/acknowledge` | PUT | HIGH |
| 5B | `PUT /api/v1/alerts/:id/resolve` | PUT | HIGH |
| 5B | `GET /api/v1/trips` | GET | HIGH |
| 5B | `GET /api/v1/trips/:id` | GET | HIGH |
| 5B | `GET /api/v1/trips/:id/route` | GET | HIGH |
| 5B | `GET/POST/PUT/DELETE /api/v1/maintenance` | ALL | HIGH |
| 5D | `GET/PUT/DELETE /api/v1/notifications` | ALL | MEDIUM |
| 5D | `PUT /api/v1/notifications/read-all` | PUT | MEDIUM |
| 5D | `GET /api/v1/system-admin/health` | GET | MEDIUM |
| 5D | `GET /api/v1/system-admin/metrics` | GET | MEDIUM |
| 5D | `GET /api/v1/system-admin/logs` | GET | MEDIUM |

### Required WebSocket Events

| Event | Direction | Data Shape | Subscribed Pages |
|-------|-----------|------------|------------------|
| `device.location.updated` | Server -> Client | `DeviceLocation` | Map |
| `device.status.changed` | Server -> Client | `{ deviceId, status }` | Devices, Map, Dashboard |
| `alert.new` | Server -> Client | `Alert` | Alerts, Dashboard |
| `alert.resolved` | Server -> Client | `{ alertId }` | Alerts |
| `notification.new` | Server -> Client | `Notification` | All (header badge) |
| `firmware.progress` | Server -> Client | `{ deviceId, progress, status }` | Firmware |
| `stats.updated` | Server -> Client | `DashboardStats` | Dashboard |
| `trip.started` | Server -> Client | `{ tripId, vehicleId }` | Trips, Map |
| `trip.ended` | Server -> Client | `{ tripId }` | Trips |
