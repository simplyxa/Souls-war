import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/auth.decorators';
import { PlayersService } from './players.service';

@ApiTags('players')
@ApiBearerAuth()
@Controller('players')
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return this.players.view(await this.players.requirePlayer(user.userId));
  }

  @Get('top')
  top() {
    return this.players.leaderboard();
  }
}
