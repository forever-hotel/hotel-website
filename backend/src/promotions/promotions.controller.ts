import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { PromotionsService } from './promotions.service';

export class PromotionsQueryDto {
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

@ApiTags('promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'List active, valid and non-exhausted promotion codes',
  })
  findActive(@Query() query: PromotionsQueryDto) {
    return this.promotions.findActive(query.limit);
  }
}
