export interface SessionIdentityLike {
  localSessionKey?: number | null;
  bootId?: string | null;
}

const toPositiveInt = (value: number | null | undefined): number | undefined => {
  return Number.isSafeInteger(value) && value! > 0 ? value! : undefined;
};

const normalizeBootId = (value: string | null | undefined): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

export const resolveLocalSessionKey = (
  localSessionKey?: number | null,
  legacySessionId?: number | null,
): number | undefined => {
  return toPositiveInt(localSessionKey) ?? toPositiveInt(legacySessionId);
};

export const hasSessionIdentityConflict = (
  active: SessionIdentityLike,
  incoming: SessionIdentityLike,
): boolean => {
  const activeLocalSessionKey = toPositiveInt(active.localSessionKey);
  const incomingLocalSessionKey = toPositiveInt(incoming.localSessionKey);
  if (
    activeLocalSessionKey !== undefined &&
    incomingLocalSessionKey !== undefined &&
    activeLocalSessionKey !== incomingLocalSessionKey
  ) {
    return true;
  }

  const activeBootId = normalizeBootId(active.bootId);
  const incomingBootId = normalizeBootId(incoming.bootId);
  if (
    activeBootId !== undefined &&
    incomingBootId !== undefined &&
    activeBootId !== incomingBootId
  ) {
    return true;
  }

  return false;
};

export const canHydrateSessionIdentity = (
  active: SessionIdentityLike,
  incoming: SessionIdentityLike,
): boolean => {
  if (hasSessionIdentityConflict(active, incoming)) {
    return false;
  }

  const activeLocalSessionKey = toPositiveInt(active.localSessionKey);
  const incomingLocalSessionKey = toPositiveInt(incoming.localSessionKey);
  const activeBootId = normalizeBootId(active.bootId);
  const incomingBootId = normalizeBootId(incoming.bootId);

  return (
    (activeLocalSessionKey === undefined && incomingLocalSessionKey !== undefined) ||
    (activeBootId === undefined && incomingBootId !== undefined)
  );
};
