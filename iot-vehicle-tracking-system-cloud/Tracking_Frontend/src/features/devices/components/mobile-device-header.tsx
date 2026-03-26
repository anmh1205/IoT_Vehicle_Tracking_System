import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
export const MobileDeviceHeader = ({ onCreate }: { onCreate: () => void }) => {
  return (
    <div className="flex items-center justify-between sm:hidden">
      <h3 className="text-base font-semibold">Thiết bị</h3>
      <Button size="sm" className="h-11" onClick={onCreate}>
        <Plus className="mr-1 h-4 w-4" />
        Thêm
      </Button>
    </div>
  );
};
