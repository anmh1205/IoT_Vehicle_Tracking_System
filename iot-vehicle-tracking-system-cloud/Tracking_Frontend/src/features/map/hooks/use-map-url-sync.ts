'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  applyMapUrlStateToSearchParams,
  createMapUrlState,
  type MapUrlState,
  parseMapUrlState,
  serializeMapUrlState,
} from '@/features/map/lib/map-url-state';
import { fallbackBrowseMode } from '@/features/map/lib/map-mode';
import { useMapStore } from '@/features/map/store/map-store';

const createStoreUrlState = (
  state: Pick<
    ReturnType<typeof useMapStore.getState>,
    | 'followMode'
    | 'hardMode'
    | 'mapLayer'
    | 'mapViewport'
    | 'selectedDeviceId'
    | 'showGeofences'
  >,
): MapUrlState =>
  createMapUrlState({
    selectedDeviceId: state.selectedDeviceId,
    mapViewport: state.mapViewport,
    mapLayer: state.mapLayer,
    followMode: state.followMode,
    showGeofences: state.showGeofences,
    hardMode:
      state.hardMode === 'mobile-list'
        ? fallbackBrowseMode(state.selectedDeviceId)
        : state.hardMode,
  });

export const useMapUrlSync = () => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const applyUrlState = useMapStore((state) => state.applyUrlState);
  const selectedDeviceId = useMapStore((state) => state.selectedDeviceId);
  const mapViewport = useMapStore((state) => state.mapViewport);
  const mapLayer = useMapStore((state) => state.mapLayer);
  const followMode = useMapStore((state) => state.followMode);
  const showGeofences = useMapStore((state) => state.showGeofences);
  const hardMode = useMapStore((state) => state.hardMode);
  const hydratedRef = useRef(false);
  const currentSearch = searchParams.toString();
  const currentState = useMemo(
    () =>
      createStoreUrlState({
        selectedDeviceId,
        mapViewport,
        mapLayer,
        followMode,
        showGeofences,
        hardMode,
      }),
    [
      followMode,
      hardMode,
      mapLayer,
      mapViewport,
      selectedDeviceId,
      showGeofences,
    ],
  );
  const nextSearch = useMemo(
    () =>
      applyMapUrlStateToSearchParams(
        new URLSearchParams(currentSearch),
        currentState,
      ).toString(),
    [currentSearch, currentState],
  );

  useEffect(() => {
    const urlState = parseMapUrlState(new URLSearchParams(currentSearch));
    const urlStateSignature = serializeMapUrlState(urlState);
    const storeStateSignature = serializeMapUrlState(
      createStoreUrlState(useMapStore.getState()),
    );

    hydratedRef.current = true;

    if (urlStateSignature === storeStateSignature) {
      return;
    }

    applyUrlState(urlState);
  }, [applyUrlState, currentSearch]);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    if (nextSearch === currentSearch) {
      return;
    }

    const href = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    router.replace(href, { scroll: false });
  }, [currentSearch, nextSearch, pathname, router]);
};
