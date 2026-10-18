import { ApiProperty } from '@nestjs/swagger';
import { ErrorResponse } from '../interfaces/error-response.interface';

/** Team error body, described for the API docs. */
export class ErrorResponseDto implements ErrorResponse {
  @ApiProperty({ example: 'VALIDATION_FAILED' })
  error: string;

  @ApiProperty({ example: 'email must be an email' })
  message: string;
}
