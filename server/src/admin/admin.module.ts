import { Module } from '@nestjs/common';
import { createCrudController } from './crud.controller';
import { ItemDto, LocationDto, LocationLinkDto, NpcDto, QuestDto, ShopEntryDto } from './admin.dto';

@Module({
  controllers: [
    createCrudController('locations', 'location', LocationDto),
    createCrudController('location-links', 'locationLink', LocationLinkDto),
    createCrudController('items', 'item', ItemDto),
    createCrudController('npcs', 'npc', NpcDto),
    createCrudController('shop-entries', 'shopEntry', ShopEntryDto),
    createCrudController('quests', 'quest', QuestDto),
  ],
})
export class AdminModule {}
