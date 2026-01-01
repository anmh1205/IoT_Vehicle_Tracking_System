/**
 * Device Form Schema
 */
import { z } from 'zod';

export const deviceSchema = z.object({
    deviceId: z.string().min(1, 'Device ID is required'),
    deviceType: z.string().optional(),
    firmwareVersion: z.string().optional(),
    hardwareVersion: z.string().optional(),
    imei: z.string().optional(),
    simCardNumber: z.string().optional(),
    status: z.enum(['active', 'inactive', 'offline', 'error']).optional(),
    vehicleId: z.number().int().positive().optional(),
});

export type DeviceFormData = z.infer<typeof deviceSchema>;
