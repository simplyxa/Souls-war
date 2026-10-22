import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/auth.decorators';
import { TradeDto } from './shop.dto';
import { ShopService } from './shop.service';

@ApiTags('shop')
@ApiBearerAuth()
@Controller('shop')
export class ShopController {
  constructor(private readonly shop: ShopService) {}

  @Get()
  view(@CurrentUser() user: AuthUser) {
    return this.shop.view(user.userId);
  }

  @Post('buy')
  @HttpCode(200)
  buy(@CurrentUser() user: AuthUser, @Body() dto: TradeDto) {
    return this.shop.buy(user.userId, dto.itemId, dto.quantity);
  }

  @Post('sell')
  @HttpCode(200)
  sell(@CurrentUser() user: AuthUser, @Body() dto: TradeDto) {
    return this.shop.sell(user.userId, dto.itemId, dto.quantity);
  }
}
