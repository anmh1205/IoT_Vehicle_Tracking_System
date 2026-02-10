type DeviceCommandStatus = 'pending' | 'sent' | 'acknowledged' | 'failed';

interface DeviceCommandRecord {
  id: number;
  deviceId: string;
  command: string;
  params: Record<string, unknown>;
  status: DeviceCommandStatus;
  sentAt: string;
  ackedAt: string | null;
  response: string | null;
}

const commandStore = new Map<string, DeviceCommandRecord[]>();
let commandIdCounter = 1;

export const sendCommand = async (
  deviceId: string,
  payload: { command: string; params?: Record<string, unknown> },
): Promise<DeviceCommandRecord> => {
  const command: DeviceCommandRecord = {
    id: commandIdCounter++,
    deviceId,
    command: payload.command,
    params: payload.params ?? {},
    status: 'sent',
    sentAt: new Date().toISOString(),
    ackedAt: null,
    response: null,
  };

  const current = commandStore.get(deviceId) ?? [];
  commandStore.set(deviceId, [command, ...current].slice(0, 500));
  return command;
};

export const listCommands = async (deviceId: string, page = 1, limit = 20) => {
  const rows = commandStore.get(deviceId) ?? [];
  const offset = (page - 1) * limit;
  const items = rows.slice(offset, offset + limit);

  return {
    items,
    pagination: {
      page,
      limit,
      total: rows.length,
      totalPages: Math.max(Math.ceil(rows.length / limit), 1),
    },
  };
};
