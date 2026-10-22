import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PlayersModule } from './players/players.module';
import { LogsModule } from './logs/logs.module';
import { InventoryModule } from './inventory/inventory.module';
import { QuestsModule } from './quests/quests.module';
import { WorldModule } from './world/world.module';
import { CombatModule } from './combat/combat.module';
import { ShopModule } from './shop/shop.module';
import { AdminModule } from './admin/admin.module';
import { JwtAuthGuard, RolesGuard } from './common/guards';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    LogsModule,
    PlayersModule,
    InventoryModule,
    QuestsModule,
    AuthModule,
    WorldModule,
    CombatModule,
    ShopModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
