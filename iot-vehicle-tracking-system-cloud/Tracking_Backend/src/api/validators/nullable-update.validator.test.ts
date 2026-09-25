import { updateCustomerSchema } from './customer.validator';
import { updateDriverSchema } from './driver.validator';
import { updateTripSchema } from './trip.validator';
import { updateVehicleSchema } from './vehicle.validator';

describe('nullable update validators', () => {
  it('allows clearing optional driver profile fields', () => {
    const parsed = updateDriverSchema.parse({
      phone: null,
      email: null,
      licenseNumber: null,
      licenseType: null,
      licenseExpiry: null,
      dateOfBirth: null,
      address: null,
      notes: null,
    });

    expect(parsed.licenseType).toBeNull();
  });

  it('allows clearing optional customer contact fields', () => {
    const parsed = updateCustomerSchema.parse({
      contactPerson: null,
      phone: null,
      email: null,
      address: null,
      taxCode: null,
      notes: null,
    });

    expect(parsed.email).toBeNull();
  });

  it('allows clearing optional trip assignment and schedule fields', () => {
    const parsed = updateTripSchema.parse({
      vehicleId: null,
      deviceId: null,
      driverName: null,
      driverPhone: null,
      startLocation: null,
      endLocation: null,
      plannedStart: null,
      plannedEnd: null,
      notes: null,
    });

    expect(parsed.plannedStart).toBeNull();
  });

  it('allows clearing optional vehicle assignment fields', () => {
    const parsed = updateVehicleSchema.parse({
      customerId: null,
      plateNumber: null,
      brand: null,
      model: null,
      year: null,
    });

    expect(parsed.plateNumber).toBeNull();
    expect(parsed.year).toBeNull();
  });
});
