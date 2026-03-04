import ExcelJS from 'exceljs';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { findMany } from '@/infrastructure/database/queries';
import { createLogger } from '@/infrastructure/logger';

const log = createLogger('export-file');

const EXPORTS_DIR = path.resolve(process.cwd(), 'exports');

interface ColumnDef {
  header: string;
  key: string;
  width?: number;
}

const EXPORT_CONFIGS: Record<string, { sheetName: string; query: string; columns: ColumnDef[] }> = {
  devices: {
    sheetName: 'Devices',
    query: 'SELECT id, device_id, device_name, current_status, imei, firmware_version, vibration_threshold, request_interval, latitude, longitude, last_seen_at, created_at FROM devices ORDER BY created_at DESC',
    columns: [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Device ID', key: 'device_id', width: 20 },
      { header: 'Device Name', key: 'device_name', width: 25 },
      { header: 'Status', key: 'current_status', width: 15 },
      { header: 'IMEI', key: 'imei', width: 20 },
      { header: 'Firmware', key: 'firmware_version', width: 15 },
      { header: 'Vibration Threshold', key: 'vibration_threshold', width: 20 },
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

export const generateExcelFile = async (
  exportType: string,
  jobId: number,
): Promise<string> => {
  const config = EXPORT_CONFIGS[exportType];
  if (!config) {
    throw new Error(`Unsupported export type: ${exportType}`);
  }

  mkdirSync(EXPORTS_DIR, { recursive: true });

  const rows = await findMany<Record<string, unknown>>(config.query);
  log.info(`Fetched ${rows.length} rows for export type "${exportType}"`);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IoT Vehicle Tracking System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(config.sheetName);
  sheet.columns = config.columns;

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = HEADER_ALIGNMENT;
  });
  headerRow.height = 24;

  // Add data rows with date formatting
  for (const row of rows) {
    const values: Record<string, unknown> = {};
    for (const col of config.columns) {
      const val = row[col.key];
      values[col.key] = val instanceof Date ? val.toISOString() : (val ?? '');
    }
    sheet.addRow(values);
  }

  const timestamp = Date.now();
  const fileName = `${exportType}_${jobId}_${timestamp}.xlsx`;
  const filePath = path.join(EXPORTS_DIR, fileName);

  await workbook.xlsx.writeFile(filePath);
  log.info(`Excel file written: ${filePath}`);

  return filePath;
};
