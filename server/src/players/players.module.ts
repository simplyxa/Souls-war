import { Global, Module } from '@nestjs/common';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';

@Global()
@Module({
  controllers: [PlayersController],
  providers: [PlayersService],
  exports: [PlayersService],
})
export class PlayersModule {}
