import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class ItemIdDto {
  @ApiProperty({ example: 1, description: 'Item id' })
  @IsInt()
  @Min(1)
  itemId: number;
}
