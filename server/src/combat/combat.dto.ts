import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export enum CombatActionType {
  ATTACK = 'ATTACK',
  DEFEND = 'DEFEND',
  USE_ITEM = 'USE_ITEM',
  FLEE = 'FLEE',
}

export class StartCombatDto {
  @ApiProperty({ example: 1, description: 'NPC (monster) id in the current location' })
  @IsInt()
  @Min(1)
  npcId: number;
}

export class CombatActionDto {
  @ApiProperty({ enum: CombatActionType })
  @IsEnum(CombatActionType)
  action: CombatActionType;

  @ApiPropertyOptional({ description: 'Required for USE_ITEM' })
  @IsOptional()
  @IsInt()
  @Min(1)
  itemId?: number;
}
