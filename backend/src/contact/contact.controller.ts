import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { ContactService } from './contact.service';
import { ContactRateLimitGuard } from './contact-rate-limit.guard';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';

class EnquiryResponseDto {
  @ApiProperty({
    enum: ['accepted', 'sandbox'],
    description:
      'Accepted means provider-accepted, not inbox delivery. Sandbox never sends.',
  })
  status: 'accepted' | 'sandbox';
}

@ApiTags('contact')
@Controller('contact/enquiries')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(202)
  @UseGuards(ContactRateLimitGuard)
  @ApiOperation({ summary: 'Submit a hotel enquiry' })
  @ApiAcceptedResponse({ type: EnquiryResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  send(@Body() enquiry: CreateEnquiryDto): Promise<EnquiryResponseDto> {
    return this.contactService.send(enquiry);
  }
}
