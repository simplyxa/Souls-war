import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/auth.decorators';
import { ItemIdDto } from './inventory.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.inventory.list(user.userId);
  }

  @Post('use')
  @HttpCode(200)
  use(@CurrentUser() user: AuthUser, @Body() dto: ItemIdDto) {
    return this.inventory.use(user.userId, dto.itemId);
  }

  @Post('equip')
  @HttpCode(200)
  equip(@CurrentUser() user: AuthUser, @Body() dto: ItemIdDto) {
    return this.inventory.equip(user.userId, dto.itemId);
  }

  @Post('unequip')
  @HttpCode(200)
  unequip(@CurrentUser() user: AuthUser, @Body() dto: ItemIdDto) {
    return this.inventory.unequip(user.userId, dto.itemId);
  }
}
