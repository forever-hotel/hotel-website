import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { RoomTypeListResponseDto } from './dto/room-type-list-response.dto';
import { RoomTypeParamsDto } from './dto/room-type-params.dto';
import { RoomTypeResponseDto } from './dto/room-type-response.dto';
import { RoomTypesService } from './room-types.service';

@ApiTags('room-types')
@Controller('room-types')
export class RoomTypesController {
  constructor(private readonly roomTypesService: RoomTypesService) {}

  @Get()
  @ApiOperation({ summary: 'List all room types, cheapest first (HW-03)' })
  @ApiOkResponse({ type: RoomTypeListResponseDto })
  findAll(): Promise<RoomTypeListResponseDto> {
    return this.roomTypesService.findAll();
  }

  @Get(':roomTypeId')
  @ApiOperation({ summary: 'Get room type details (HW-03)' })
  @ApiOkResponse({ type: RoomTypeResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'VALIDATION_FAILED: roomTypeId must be a UUID',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'ROOM_TYPE_NOT_FOUND',
  })
  findById(@Param() params: RoomTypeParamsDto): Promise<RoomTypeResponseDto> {
    return this.roomTypesService.findById(params.roomTypeId);
  }
}
