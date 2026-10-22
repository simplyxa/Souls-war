import { Controller, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/auth.decorators';
import { QuestsService } from './quests.service';

@ApiTags('quests')
@ApiBearerAuth()
@Controller('quests')
export class QuestsController {
  constructor(private readonly quests: QuestsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.quests.list(user.userId);
  }

  @Post(':id/accept')
  @HttpCode(200)
  accept(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.quests.accept(user.userId, id);
  }

  @Post(':id/complete')
  @HttpCode(200)
  complete(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.quests.complete(user.userId, id);
  }
}
