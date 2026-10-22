import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/auth.decorators';
import { CombatActionDto, StartCombatDto } from './combat.dto';
import { CombatService } from './combat.service';

@ApiTags('combat')
@ApiBearerAuth()
@Controller('combat')
export class CombatController {
  constructor(private readonly combat: CombatService) {}

  @Get()
  current(@CurrentUser() user: AuthUser) {
    return this.combat.current(user.userId);
  }

  @Post('start')
  @HttpCode(200)
  start(@CurrentUser() user: AuthUser, @Body() dto: StartCombatDto) {
    return this.combat.start(user.userId, dto.npcId);
  }

  @Post('action')
  @HttpCode(200)
  act(@CurrentUser() user: AuthUser, @Body() dto: CombatActionDto) {
    return this.combat.act(user.userId, dto);
  }
}
