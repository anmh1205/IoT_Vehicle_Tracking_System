import { TabsList, TabsTrigger } from '@/components/ui/tabs';
export type MobileDeviceTab = 'table' | 'cards';
export const MobileTabSelector = () => {
  return (
    <TabsList className="grid w-full grid-cols-2 sm:hidden">
      <TabsTrigger value="table">Bảng</TabsTrigger>
      <TabsTrigger value="cards">Cards</TabsTrigger>
    </TabsList>
  );
};
