'use client';

import { useState, useCallback } from 'react';
import { useDevices } from '@/hooks/useDevices';
import { DeviceFilters } from '@/components/devices/device-filters';
import { DeviceList } from '@/components/devices/device-list';
import { DeviceDetailModal } from '@/components/devices/device-detail-modal';
import { DeviceForm } from '@/components/devices/device-form';
import type { DeviceDetail, DeviceListQuery } from '@/types/device.types';

export default function DevicesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('deviceId');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editDevice, setEditDevice] = useState<DeviceDetail | null>(null);

  const params: DeviceListQuery = {
    page,
    limit: 15,
    ...(search && { search }),
    ...(status && { status }),
    sortBy,
    sortOrder,
  };

  const { data, isLoading, isError } = useDevices(params);

  const handleSort = useCallback((field: string) => {
    setSortBy((prev) => {
      if (prev === field) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortOrder('asc');
      return field;
    });
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatus(value);
    setPage(1);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditDevice(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((device: DeviceDetail) => {
    setSelectedDeviceId(null);
    setEditDevice(device);
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditDevice(null);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedDeviceId(null);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Devices</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your IoT tracking devices.
        </p>
      </div>

      <DeviceFilters
        search={search}
        status={status}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onAddDevice={handleOpenCreate}
      />

      <DeviceList
        devices={data?.items}
        pagination={data?.pagination}
        isLoading={isLoading}
        isError={isError}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onPageChange={setPage}
        onSelectDevice={setSelectedDeviceId}
      />

      {selectedDeviceId !== null && (
        <DeviceDetailModal
          deviceId={selectedDeviceId}
          onClose={handleCloseDetail}
          onEdit={handleEdit}
        />
      )}

      {showForm && (
        <DeviceForm
          device={editDevice}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
