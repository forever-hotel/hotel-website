import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { GuestResponseDto } from './dto/guest-response.dto';
import { RegisterGuestDto } from './dto/register-guest.dto';
import { GuestsService } from './guests.service';

@ApiTags('guests')
@Controller('guests')
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a guest account (HW-06)' })
  @ApiCreatedResponse({ type: GuestResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'VALIDATION_FAILED: invalid or unknown fields',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'EMAIL_ALREADY_REGISTERED',
  })
  async register(@Body() dto: RegisterGuestDto): Promise<GuestResponseDto> {
    const guest = await this.guestsService.register(dto);
    return GuestResponseDto.fromGuest(guest);
  }
}
