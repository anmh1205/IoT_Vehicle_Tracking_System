## XIII.11 Form Handling

### XIII.11.1 Form Pattern

```typescript
// src/features/vehicles/components/vehicle-form.tsx
export function VehicleForm({ vehicleId }: { vehicleId?: number }) {
  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: async () => {
      if (vehicleId) {
        const vehicle = await vehicleApi.get(vehicleId);
        return vehicle;
      }
      return defaultValues;
    },
  });
  
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  
  const onSubmit = (data: VehicleFormData) => {
    if (vehicleId) {
      updateMutation.mutate({ id: vehicleId, data });
    } else {
      createMutation.mutate(data);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  );
}
```

