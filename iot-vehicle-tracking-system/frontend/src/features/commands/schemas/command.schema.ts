/**
 * Command Form Schema
 */
import { z } from 'zod';

export const commandSchema = z.object({
    deviceId: z.number().int().positive('Device is required'),
    type: z.enum([
        'engine_on',
        'engine_off',
        'lock',
        'unlock',
        'locate',
        'reboot',
        'update_config',
    ], { required_error: 'Command type is required' }),
    payload: z.record(z.unknown()).optional(),
});

export type CommandFormData = z.infer<typeof commandSchema>;
