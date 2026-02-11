import { useRegisterActions } from 'kbar';
import { useTheme } from 'next-themes';

const useThemeSwitching = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const themeAction = [
    {
      id: 'toggleTheme',
      name: 'Chuyển giao diện',
      shortcut: ['t', 't'],
      section: 'Giao diện',
      perform: toggleTheme,
    },
    {
      id: 'setLightTheme',
      name: 'Đặt giao diện sáng',
      section: 'Giao diện',
      perform: () => setTheme('light'),
    },
    {
      id: 'setDarkTheme',
      name: 'Đặt giao diện tối',
      section: 'Giao diện',
      perform: () => setTheme('dark'),
    },
  ];

  useRegisterActions(themeAction, [theme]);
};

export default useThemeSwitching;
