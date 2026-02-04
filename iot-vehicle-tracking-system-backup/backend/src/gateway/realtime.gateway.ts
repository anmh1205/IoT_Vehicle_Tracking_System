import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(RealtimeGateway.name);

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('subscribe:vehicle')
    handleSubscribeVehicle(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { vehicleId: string },
    ) {
        const room = `vehicle:${data.vehicleId}`;
        client.join(room);
        this.logger.log(`Client ${client.id} subscribed to ${room}`);
        return { event: 'subscribed', room };
    }

    @SubscribeMessage('unsubscribe:vehicle')
    handleUnsubscribeVehicle(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { vehicleId: string },
    ) {
        const room = `vehicle:${data.vehicleId}`;
        client.leave(room);
        this.logger.log(`Client ${client.id} unsubscribed from ${room}`);
        return { event: 'unsubscribed', room };
    }

    @SubscribeMessage('subscribe:alerts')
    handleSubscribeAlerts(@ConnectedSocket() client: Socket) {
        client.join('alerts');
        this.logger.log(`Client ${client.id} subscribed to alerts`);
        return { event: 'subscribed', room: 'alerts' };
    }

    // Method to emit location updates (called from other services)
    emitLocationUpdate(vehicleId: string, location: any) {
        this.server.to(`vehicle:${vehicleId}`).emit('location:update', {
            vehicleId,
            ...location,
            timestamp: new Date().toISOString(),
        });
    }

    // Method to emit alerts (called from other services)
    emitAlert(alert: any) {
        this.server.to('alerts').emit('alert:new', alert);
    }
}
