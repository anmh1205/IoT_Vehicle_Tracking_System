/**
 * Geofence Form Schema
 */
import { z } from 'zod';

const geoPointSchema = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
});

export const geofenceSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    type: z.enum(['circle', 'polygon']),
    center: geoPointSchema.optional(),
    radius: z.number().positive().optional(),
    coordinates: z.array(geoPointSchema).optional(),
    isActive: z.boolean().optional(),
}).refine((data) => {
    if (data.type === 'circle') {
        return data.center && data.radius;
    }
    return true;
}, {
    message: 'Circle geofence requires center and radius',
    path: ['center'],
}).refine((data) => {
    if (data.type === 'polygon') {
        return data.coordinates && data.coordinates.length >= 3;
    }
    return true;
}, {
    message: 'Polygon geofence requires at least 3 points',
    path: ['coordinates'],
});

export type GeofenceFormData = z.infer<typeof geofenceSchema>;
