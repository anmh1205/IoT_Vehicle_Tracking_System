'use client';
import { navConfig } from '@/config/nav-config';
import {
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarProvider,
  KBarSearch,
} from 'kbar';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import KBarContent from './kbar-content';
import useThemeSwitching from './use-theme-switching';
import { useFilteredNavItems } from '@/hooks/use-nav';

export default function KBar({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const mainItems = useFilteredNavItems(navConfig.main);
  const secondaryItems = useFilteredNavItems(navConfig.secondary);

  const actions = useMemo(() => {
    const navigateTo = (url: string) => {
      router.push(url);
    };

    const allItems = [...mainItems, ...secondaryItems];

    return allItems.flatMap((navItem) => {
      const baseAction =
        navItem.url !== '#'
          ? {
              id: `${navItem.title.toLowerCase()}Action`,
              name: navItem.title,
              keywords: navItem.title.toLowerCase(),
              section: 'Navigation',
              subtitle: `Go to ${navItem.title}`,
              perform: () => navigateTo(navItem.url),
            }
          : null;

      const childActions =
        navItem.items?.map((childItem) => ({
          id: `${childItem.title.toLowerCase()}Action`,
          name: childItem.title,
          keywords: childItem.title.toLowerCase(),
          section: navItem.title,
          subtitle: `Go to ${childItem.title}`,
          perform: () => navigateTo(childItem.url),
        })) ?? [];

      return baseAction ? [baseAction, ...childActions] : childActions;
    });
  }, [router, mainItems, secondaryItems]);

  return (
    <KBarProvider actions={actions}>
      <KBarComponent>{children}</KBarComponent>
    </KBarProvider>
  );
}

const KBarComponent = ({ children }: { children: React.ReactNode }) => {
  useThemeSwitching();

  return (
    <>
      <KBarPortal>
        <KBarPositioner className="bg-background/80 fixed inset-0 z-50 p-0 backdrop-blur-sm">
          <KBarAnimator className="bg-card text-card-foreground relative mt-64 w-full max-w-[600px] -translate-y-12 overflow-hidden rounded-lg border shadow-lg">
            <div className="bg-card border-border sticky top-0 z-10 border-b">
              <KBarSearch className="bg-card w-full border-none px-6 py-4 text-lg outline-none" />
            </div>
            <div className="max-h-[400px]">
              <KBarContent />
            </div>
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
      {children}
    </>
  );
};


