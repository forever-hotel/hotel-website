import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentGuest } from '../common/decorators/current-guest.decorator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedGuest } from '../common/interfaces/authenticated-guest.interface';
import { GuestAuthResponseDto } from './dto/guest-auth-response.dto';
import { GuestResponseDto } from './dto/guest-response.dto';
import { LoginGuestDto } from './dto/login-guest.dto';
import { RegisterGuestDto } from './dto/register-guest.dto';
import { GuestsService } from './guests.service';

@ApiTags('guests')
@Controller('guests')
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in a guest and issue a JWT (HW-07)' })
  @ApiOkResponse({ type: GuestAuthResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'VALIDATION_FAILED: invalid or unknown fields',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'INVALID_CREDENTIALS',
  })
  async login(@Body() dto: LoginGuestDto): Promise<GuestAuthResponseDto> {
    return this.guestsService.login(dto);
  }

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

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated guest profile (HW-07)' })
  @ApiOkResponse({ type: GuestResponseDto })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'UNAUTHORIZED: missing, invalid or expired bearer token',
  })
  async me(
    @CurrentGuest() currentGuest: AuthenticatedGuest,
  ): Promise<GuestResponseDto> {
    const guest = await this.guestsService.getAuthenticatedGuest(
      currentGuest.sub,
    );
    return GuestResponseDto.fromGuest(guest);
  }
}
