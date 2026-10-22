import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class TradeDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  itemId: number;

  @ApiProperty({ example: 1, minimum: 1, maximum: 99 })
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;
}
