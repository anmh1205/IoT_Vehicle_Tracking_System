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
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createLogger } from '@/common/utils/logger.util';

@WebSocketGateway({
  namespace: 'vehicles',
  cors: {
    origin: '*',
    credentials: true,
  },
  path: '/ws',
})
export class VehiclesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = createLogger(VehiclesGateway.name);
  private readonly connectedClients = new Map<string, Socket>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake auth or query
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token?.toString();

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('auth.jwtSecret'),
      });

      // Attach user info to socket
      (client as any).user = payload;

      this.connectedClients.set(client.id, client);
      this.logger.log(
        `Client ${client.id} connected (user: ${payload.username})`
      );

      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected to vehicles namespace',
        userId: payload.sub,
      });
    } catch (error) {
      this.logger.error(
        `Authentication failed for client ${client.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('vehicle:join')
  handleJoinRoom(
    @MessageBody() data: { vehicleId: string },
    @ConnectedSocket() client: Socket
  ) {
    const room = `vehicle:${data.vehicleId}`;
    client.join(room);
    this.logger.log(
      `Client ${client.id} joined room ${room} (user: ${(client as any).user?.username})`
    );
    client.emit('vehicle:joined', { vehicleId: data.vehicleId });
  }

  @SubscribeMessage('vehicle:leave')
  handleLeaveRoom(
    @MessageBody() data: { vehicleId: string },
    @ConnectedSocket() client: Socket
  ) {
    const room = `vehicle:${data.vehicleId}`;
    client.leave(room);
    this.logger.log(
      `Client ${client.id} left room ${room} (user: ${(client as any).user?.username})`
    );
    client.emit('vehicle:left', { vehicleId: data.vehicleId });
  }

  /**
   * Emit location update to all clients in vehicle room
   */
  emitLocationUpdate(vehicleId: string, locationData: any) {
    this.server.to(`vehicle:${vehicleId}`).emit('vehicle.location.updated', {
      vehicleId,
      ...locationData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit status update to all clients in vehicle room
   */
  emitStatusUpdate(vehicleId: string, statusData: any) {
    this.server.to(`vehicle:${vehicleId}`).emit('vehicle.status.updated', {
      vehicleId,
      ...statusData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: any) {
    this.server.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
}

