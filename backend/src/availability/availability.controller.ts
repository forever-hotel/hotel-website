import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import {
  AvailabilityResponseDto,
  AvailabilityCalendarResponseDto,
} from './dto/availability-response.dto';
import { RoomTypeParamsDto } from '../room-types/dto/room-type-params.dto';
import { AvailabilityService } from './availability.service';
import {
  AvailabilityQueryDto,
  CalendarQueryDto,
} from './dto/availability-query.dto';

@ApiTags('availability')
@ApiBadRequestResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@ApiServiceUnavailableResponse({ type: ErrorResponseDto })
@Controller()
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get('availability')
  @ApiOkResponse({ type: AvailabilityResponseDto })
  @ApiOperation({ summary: 'Check full-stay room availability (HW-05, HW-09)' })
  check(@Query() query: AvailabilityQueryDto) {
    return this.availability.check(query);
  }

  @Get('room-types/:roomTypeId/availability-calendar')
  @ApiOkResponse({ type: AvailabilityCalendarResponseDto })
  @ApiOperation({ summary: 'Get daily availability; to is exclusive (HW-05)' })
  calendar(
    @Param() params: RoomTypeParamsDto,
    @Query() query: CalendarQueryDto,
  ) {
    return this.availability.calendar(params.roomTypeId, query.from, query.to);
  }
}
