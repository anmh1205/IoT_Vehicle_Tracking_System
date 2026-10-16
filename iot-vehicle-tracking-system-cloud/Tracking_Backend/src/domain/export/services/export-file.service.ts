import ExcelJS from 'exceljs';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { findMany } from '@/infrastructure/database/queries';
import { createLogger } from '@/infrastructure/logger';

const log = createLogger('export-file');

const EXPORTS_DIR = path.resolve(process.cwd(), 'exports');

interface ColumnDef {
  header: string;
  key: string;
  width?: number;
}

interface ExportConfig {
  sheetName: string;
  query: string;
  fallbackQuery?: string;
  columns: ColumnDef[];
}

const EXPORT_CONFIGS: Record<string, ExportConfig> = {
  devices: {
    sheetName: 'Devices',
    query: 'SELECT id, device_id, device_name, current_status, imei, firmware_version, imu_accel_delta_threshold_mps2, request_interval, latitude, longitude, last_seen_at, created_at FROM devices ORDER BY created_at DESC',
    fallbackQuery: 'SELECT id, device_id, device_name, current_status, imei, firmware_version, vibration_threshold AS imu_accel_delta_threshold_mps2, request_interval, latitude, longitude, last_seen_at, created_at FROM devices ORDER BY created_at DESC',
    columns: [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Device ID', key: 'device_id', width: 20 },
      { header: 'Device Name', key: 'device_name', width: 25 },
      { header: 'Status', key: 'current_status', width: 15 },
      { header: 'IMEI', key: 'imei', width: 20 },
      { header: 'Firmware', key: 'firmware_version', width: 15 },
      { header: 'IMU Accel Delta Threshold (m/s^2)', key: 'imu_accel_delta_threshold_mps2', width: 28 },
      { header: 'Request Interval (s)', key: 'request_interval', width: 20 },
      { header: 'Latitude', key: 'latitude', width: 14 },
      { header: 'Longitude', key: 'longitude', width: 14 },
      { header: 'Last Seen', key: 'last_seen_at', width: 22 },
      { header: 'Created At', key: 'created_at', width: 22 },
    ],
  },

  vehicles: {
    sheetName: 'Vehicles',
    query: 'SELECT id, vehicle_id, plate_number, device_id, vehicle_type, brand, model, year, color, vin, fuel_type, mileage_km, status, registration_number, insurance_expiry, created_at FROM vehicles ORDER BY created_at DESC',
    columns: [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Vehicle ID', key: 'vehicle_id', width: 18 },
      { header: 'Plate Number', key: 'plate_number', width: 16 },
      { header: 'Device ID', key: 'device_id', width: 18 },
      { header: 'Type', key: 'vehicle_type', width: 14 },
      { header: 'Brand', key: 'brand', width: 14 },
      { header: 'Model', key: 'model', width: 14 },
      { header: 'Year', key: 'year', width: 8 },
      { header: 'Color', key: 'color', width: 12 },
      { header: 'VIN', key: 'vin', width: 22 },
      { header: 'Fuel Type', key: 'fuel_type', width: 12 },
      { header: 'Mileage (km)', key: 'mileage_km', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Registration No.', key: 'registration_number', width: 18 },
      { header: 'Insurance Expiry', key: 'insurance_expiry', width: 18 },
      { header: 'Created At', key: 'created_at', width: 22 },
    ],
  },

  trips: {
    sheetName: 'Trips',
    query: 'SELECT id, trip_code, vehicle_id, device_id, driver_name, driver_phone, start_location, end_location, planned_start, planned_end, actual_start, actual_end, distance_km, fuel_used_liters, status, created_at FROM trips ORDER BY created_at DESC',
    columns: [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Trip Code', key: 'trip_code', width: 18 },
      { header: 'Vehicle ID', key: 'vehicle_id', width: 18 },
      { header: 'Device ID', key: 'device_id', width: 18 },
      { header: 'Driver Name', key: 'driver_name', width: 20 },
      { header: 'Driver Phone', key: 'driver_phone', width: 16 },
      { header: 'Start Location', key: 'start_location', width: 25 },
      { header: 'End Location', key: 'end_location', width: 25 },
      { header: 'Planned Start', key: 'planned_start', width: 22 },
      { header: 'Planned End', key: 'planned_end', width: 22 },
      { header: 'Actual Start', key: 'actual_start', width: 22 },
      { header: 'Actual End', key: 'actual_end', width: 22 },
      { header: 'Distance (km)', key: 'distance_km', width: 14 },
      { header: 'Fuel Used (L)', key: 'fuel_used_liters', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Created At', key: 'created_at', width: 22 },
    ],
  },

  alerts: {
    sheetName: 'Alerts',
    query: 'SELECT id, vehicle_id, device_id, alert_type, severity, status, title, message, latitude, longitude, speed, threshold_value, actual_value, acknowledged_at, resolved_at, resolution_notes, created_at FROM alerts ORDER BY created_at DESC',
    columns: [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Vehicle ID', key: 'vehicle_id', width: 18 },
      { header: 'Device ID', key: 'device_id', width: 18 },
      { header: 'Type', key: 'alert_type', width: 18 },
      { header: 'Severity', key: 'severity', width: 12 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Message', key: 'message', width: 35 },
      { header: 'Latitude', key: 'latitude', width: 14 },
      { header: 'Longitude', key: 'longitude', width: 14 },
      { header: 'Speed', key: 'speed', width: 10 },
      { header: 'Threshold', key: 'threshold_value', width: 12 },
      { header: 'Actual', key: 'actual_value', width: 12 },
      { header: 'Acknowledged At', key: 'acknowledged_at', width: 22 },
      { header: 'Resolved At', key: 'resolved_at', width: 22 },
      { header: 'Resolution Notes', key: 'resolution_notes', width: 30 },
      { header: 'Created At', key: 'created_at', width: 22 },
    ],
  },

  maintenance: {
    sheetName: 'Maintenance',
    query: 'SELECT id, vehicle_id, maintenance_type, title, description, scheduled_date, completed_date, mileage_at_service, next_service_mileage, next_service_date, cost, service_provider, status, notes, created_at FROM maintenance ORDER BY created_at DESC',
    columns: [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Vehicle ID', key: 'vehicle_id', width: 18 },
      { header: 'Type', key: 'maintenance_type', width: 18 },
      { header: 'Title', key: 'title', width: 25 },
      { header: 'Description', key: 'description', width: 35 },
      { header: 'Scheduled Date', key: 'scheduled_date', width: 18 },
      { header: 'Completed Date', key: 'completed_date', width: 18 },
      { header: 'Mileage at Service', key: 'mileage_at_service', width: 18 },
      { header: 'Next Service (km)', key: 'next_service_mileage', width: 18 },
      { header: 'Next Service Date', key: 'next_service_date', width: 18 },
      { header: 'Cost', key: 'cost', width: 12 },
      { header: 'Provider', key: 'service_provider', width: 20 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Notes', key: 'notes', width: 30 },
      { header: 'Created At', key: 'created_at', width: 22 },
    ],
  },
};

export const isSupportedExportType = (type: string): boolean =>
  Object.prototype.hasOwnProperty.call(EXPORT_CONFIGS, type);

const HEADER_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF2563EB' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 11,
};

const HEADER_ALIGNMENT: Partial<ExcelJS.Alignment> = {
  vertical: 'middle',
  horizontal: 'center',
};


/** Bounded streaming export. Reaching this limit fails the job rather than
 * silently truncating vehicle location or PII datasets. */
export const EXPORT_MAX_ROWS = 10_000;
export const EXPORT_PAGE_SIZE = 500;

export interface DeviceExportScope {
  deviceId: string;
  userId: number;
}

const selectPage = (query: string, deviceScope?: DeviceExportScope): string => {
  const suffix = ' ORDER BY created_at DESC';
  if (!query.endsWith(suffix)) {
    throw new Error('Export query lacks expected deterministic base ordering');
  }
  // The live SQL grant and row restriction MUST be in the same SELECT.
  // Revocation between job enqueue and the next page cannot read other devices.
  const scopePredicate = deviceScope
    ? ` AND device_id = $3 AND EXISTS (
         SELECT 1 FROM user_device_access uda
         JOIN users u ON u.id = uda.user_id
         WHERE uda.user_id = $4 AND uda.device_id = $3
           AND u.status = 'active' AND u.role IN ('root','admin','manager','operator')
       )`
    : '';
  return query.slice(0, -suffix.length)
    + ` WHERE id < $1${scopePredicate} ORDER BY id DESC LIMIT $2`;
};

export const generateExcelFile = async (
  exportType: string,
  jobId: number,
  deviceScope?: DeviceExportScope,
): Promise<string> => {
  const config = EXPORT_CONFIGS[exportType];
  if (!config) {
    throw new Error(`Unsupported export type: ${exportType}`);
  }
  if (deviceScope && (exportType !== 'devices' ||
      !/^[A-Za-z0-9._:-]{1,96}$/.test(deviceScope.deviceId) ||
      !Number.isSafeInteger(deviceScope.userId) || deviceScope.userId <= 0)) {
    throw new Error('Invalid scoped export; refusing unfiltered fallback');
  }
  mkdirSync(EXPORTS_DIR, { recursive: true });
  const filePath = path.join(EXPORTS_DIR, `${exportType}_${jobId}_${Date.now()}.xlsx`);

  // WorkbookWriter flushes rows immediately, avoiding the memory-intensive
  // in-memory worksheet used before for an entire fleet PII export.
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    filename: filePath,
    useStyles: true,
    useSharedStrings: false,
  });
  workbook.creator = 'IoT Vehicle Tracking System';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(config.sheetName);
  sheet.columns = config.columns;

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = HEADER_ALIGNMENT;
  });
  headerRow.height = 24;
  headerRow.commit();

  let lastId: string | number = '9223372036854775807';
  let emitted = 0;
  let fallback = false;
  try {
    while (emitted <= EXPORT_MAX_ROWS) {
      const query = selectPage(fallback ? config.fallbackQuery! : config.query, deviceScope);
      let page: Record<string, unknown>[];
      try {
        page = await findMany<Record<string, unknown>>(query, [
          lastId,
          Math.min(EXPORT_PAGE_SIZE, EXPORT_MAX_ROWS + 1 - emitted),
          ...(deviceScope ? [deviceScope.deviceId, deviceScope.userId] : []),
        ]);
      } catch (error) {
        if (!config.fallbackQuery || fallback || emitted > 0) throw error;
        fallback = true;
        page = await findMany<Record<string, unknown>>(selectPage(config.fallbackQuery, deviceScope), [
          lastId,
          Math.min(EXPORT_PAGE_SIZE, EXPORT_MAX_ROWS + 1 - emitted),
          ...(deviceScope ? [deviceScope.deviceId, deviceScope.userId] : []),
        ]);
      }
      if (page.length === 0) break;
      for (const row of page) {
        if (emitted >= EXPORT_MAX_ROWS) {
          throw new Error(`Export exceeds the ${EXPORT_MAX_ROWS} row safety limit; narrow its scope`);
        }
        const id = row.id;
        if ((typeof id !== 'string' && typeof id !== 'number') ||
            !/^\d+$/.test(String(id)) || Number(id) <= 0) {
          throw new Error('Export requires a stable positive numeric row ID');
        }
        const values: Record<string, unknown> = {};
        for (const col of config.columns) {
          const val = row[col.key];
          values[col.key] = val instanceof Date ? val.toISOString() : (val ?? '');
        }
        sheet.addRow(values).commit();
        lastId = id;
        emitted += 1;
      }
      if (page.length < EXPORT_PAGE_SIZE) break;
    }
    sheet.commit();
    await workbook.commit();
    log.info(`Completed bounded export type=${exportType} row_count=${emitted}`);
    return filePath;
  } catch (error) {
    // Close the XLSX writer BEFORE unlinking the partial file. On Linux, an
    // open writer can keep appending/recreate the path after a premature rm.
    try {
      sheet.commit();
      await workbook.commit();
    } catch (closeError) {
      log.error('Could not finalize failed export stream', { jobId, closeError });
    }
    // An overflow/error must never leave a downloadable partial fleet file.
    await rm(filePath, { force: true }).catch((cleanupError: unknown) => {
      log.error('Failed to remove partial export file', { jobId, cleanupError });
    });
    throw error;
  }
};
