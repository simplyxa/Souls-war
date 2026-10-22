import { Global, Module } from '@nestjs/common';
import { QuestsController } from './quests.controller';
import { QuestsService } from './quests.service';

@Global()
@Module({ controllers: [QuestsController], providers: [QuestsService], exports: [QuestsService] })
export class QuestsModule {}
