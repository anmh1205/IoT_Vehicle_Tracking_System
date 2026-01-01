import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { VehiclesGateway } from './websocket.gateway';

@Module({
  imports: [JwtModule],
  providers: [VehiclesGateway],
  exports: [VehiclesGateway],
})
export class WebSocketModule {}

