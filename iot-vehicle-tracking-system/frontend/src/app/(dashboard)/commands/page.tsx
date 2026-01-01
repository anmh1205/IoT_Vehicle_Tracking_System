/**
 * Commands Page
 */
import { PageContainer, PageHeader } from '@/components/layout/page-container';
import { CommandForm } from '@/features/commands/components/command-form';
import { CommandTable } from '@/features/commands/components/command-table';

export default function CommandsPage() {
    return (
        <PageContainer>
            <PageHeader
                title="Commands"
                description="Send commands to devices and view command history"
            />
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                    <CommandForm />
                </div>
                <div className="lg:col-span-2">
                    <CommandTable />
                </div>
            </div>
        </PageContainer>
    );
}
