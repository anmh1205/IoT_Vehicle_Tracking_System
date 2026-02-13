'use client';
import { useThemeConfig } from '@/components/active-theme';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
const DEFAULT_THEMES = [
  { name: 'Mặc định', value: 'default' },
  { name: 'Xanh dương', value: 'blue' },
  { name: 'Xanh lá', value: 'green' },
  { name: 'Vàng cam', value: 'amber' },
];
const SCALED_THEMES = [
  { name: 'Mặc định', value: 'default-scaled' },
  { name: 'Xanh dương', value: 'blue-scaled' },
];
const MONO_THEMES = [{ name: 'Đơn sắc', value: 'mono-scaled' }];
export const ThemeSelector = () => {
  const { activeTheme, setActiveTheme } = useThemeConfig();
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="theme-selector" className="sr-only">
        Giao diện
      </Label>
      <Select value={activeTheme} onValueChange={setActiveTheme}>
        <SelectTrigger
          id="theme-selector"
          className="justify-start min-w-[220px] *:data-[slot=select-value]:min-w-[120px]"
        >
          <span className="text-muted-foreground hidden sm:block whitespace-nowrap">
            Chọn giao diện:
          </span>
          <span className="text-muted-foreground block sm:hidden">Giao diện</span>
          <SelectValue placeholder="Chọn giao diện" />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectGroup>
            <SelectLabel>Mặc định</SelectLabel>
            {DEFAULT_THEMES.map((theme) => (
              <SelectItem key={theme.name} value={theme.value}>
                {theme.name}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Thu nhỏ</SelectLabel>
            {SCALED_THEMES.map((theme) => (
              <SelectItem key={theme.name} value={theme.value}>
                {theme.name}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Đơn sắc</SelectLabel>
            {MONO_THEMES.map((theme) => (
              <SelectItem key={theme.name} value={theme.value}>
                {theme.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
