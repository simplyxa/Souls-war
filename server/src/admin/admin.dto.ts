import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemType, NpcType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class LocationDto {
  @ApiProperty() @IsString() @Length(2, 60) name: string;
  @ApiProperty() @IsString() @Length(1, 2000) description: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasInn?: boolean;
}

export class LocationLinkDto {
  @ApiProperty() @IsInt() @Min(1) fromId: number;
  @ApiProperty() @IsInt() @Min(1) toId: number;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsInt() @Min(1) minLevel?: number;
}

export class ItemDto {
  @ApiProperty() @IsString() @Length(2, 60) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 500) description?: string;
  @ApiProperty({ enum: ItemType }) @IsEnum(ItemType) type: ItemType;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) price?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) damage?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) armor?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() bonusStr?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() bonusDex?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() bonusInt?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) healHp?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) restoreEnergy?: number;
}

export class NpcDto {
  @ApiProperty() @IsString() @Length(2, 60) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 500) description?: string;
  @ApiProperty({ enum: NpcType }) @IsEnum(NpcType) type: NpcType;
  @ApiProperty() @IsInt() @Min(1) locationId: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) level?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maxHp?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) attack?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) defense?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) agility?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) expReward?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) goldReward?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) dropItemId?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) dropChance?: number;
}

export class ShopEntryDto {
  @ApiProperty() @IsInt() @Min(1) npcId: number;
  @ApiProperty() @IsInt() @Min(1) itemId: number;
}

export class QuestDto {
  @ApiProperty() @IsString() @Length(2, 100) title: string;
  @ApiProperty() @IsString() @Length(1, 2000) description: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) minLevel?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) giverLocationId?: number;
  @ApiProperty() @IsInt() @Min(1) targetNpcId: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) targetCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) rewardExp?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) rewardGold?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) rewardItemId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) prerequisiteId?: number;
}
