import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/auth.decorators';
import { MoveDto } from './world.dto';
import { WorldService } from './world.service';

@ApiTags('world')
@ApiBearerAuth()
@Controller('world')
export class WorldController {
  constructor(private readonly world: WorldService) {}

  @Get('location')
  location(@CurrentUser() user: AuthUser) {
    return this.world.currentLocation(user.userId);
  }

  @Post('move')
  @HttpCode(200)
  move(@CurrentUser() user: AuthUser, @Body() dto: MoveDto) {
    return this.world.move(user.userId, dto.locationId);
  }

  @Post('rest')
  @HttpCode(200)
  rest(@CurrentUser() user: AuthUser) {
    return this.world.rest(user.userId);
  }
}
