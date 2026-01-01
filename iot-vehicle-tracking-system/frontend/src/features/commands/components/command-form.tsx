/**
 * Command Form Component - Send commands to devices
 */
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useSendCommand } from '@/hooks/mutations/use-command-mutations';
import { useDevices } from '@/hooks/queries/use-devices';
import { commandSchema, type CommandFormData } from '../schemas/command.schema';
import { Send, Loader2 } from 'lucide-react';

const commandTypes = [
    { value: 'engine_on', label: 'Engine On' },
    { value: 'engine_off', label: 'Engine Off' },
    { value: 'lock', label: 'Lock Vehicle' },
    { value: 'unlock', label: 'Unlock Vehicle' },
    { value: 'locate', label: 'Locate' },
    { value: 'reboot', label: 'Reboot Device' },
    { value: 'update_config', label: 'Update Config' },
];

export function CommandForm() {
    const { data: devicesData, isLoading: devicesLoading } = useDevices();
    const sendCommand = useSendCommand();

    const form = useForm<CommandFormData>({
        resolver: zodResolver(commandSchema),
        defaultValues: {
            deviceId: undefined,
            type: undefined,
        },
    });

    const onSubmit = (data: CommandFormData) => {
        sendCommand.mutate(
            {
                deviceId: String(data.deviceId),
                data: {
                    deviceId: data.deviceId,
                    type: data.type,
                    payload: data.payload,
                },
            },
            {
                onSuccess: () => {
                    form.reset();
                },
            }
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Send Command
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="deviceId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Device</FormLabel>
                                    <Select
                                        onValueChange={(value) => field.onChange(Number(value))}
                                        value={field.value?.toString()}
                                        disabled={devicesLoading}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a device" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {devicesData?.data?.map((device) => (
                                                <SelectItem key={device.id} value={device.id.toString()}>
                                                    {device.deviceId} ({device.status})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Command Type</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select command type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {commandTypes.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button
                            type="submit"
                            disabled={sendCommand.isPending}
                            className="w-full"
                        >
                            {sendCommand.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4" />
                                    Send Command
                                </>
                            )}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
