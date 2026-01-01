/**
 * Customers List Page
 */
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageContainer, PageHeader } from '@/components/layout/page-container';
import { CustomerTable } from '@/features/customers/components/customer-table';
import { Plus } from 'lucide-react';

export default function CustomersPage() {
    return (
        <PageContainer>
            <PageHeader
                title="Customers"
                description="Manage customer information"
                action={
                    <Link href="/dashboard/customers/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Customer
                        </Button>
                    </Link>
                }
            />
            <CustomerTable />
        </PageContainer>
    );
}
