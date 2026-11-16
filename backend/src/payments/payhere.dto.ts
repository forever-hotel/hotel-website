import { Type } from 'class-transformer';
import {
  IsString,
  Length,
  Matches,
  ValidateNested,
  IsDefined,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StartPaymentDto } from './payments.controller';

export class BillingDto {
  @ApiProperty() @IsString() @Length(1, 100) @Matches(/\S/) firstName: string;
  @ApiProperty() @IsString() @Length(1, 100) @Matches(/\S/) lastName: string;
  @ApiProperty() @IsString() @Matches(/^\+?[0-9 ()-]{7,20}$/) phone: string;
  @ApiProperty() @IsString() @Length(1, 200) @Matches(/\S/) address: string;
  @ApiProperty() @IsString() @Length(1, 100) @Matches(/\S/) city: string;
  @ApiProperty() @IsString() @Length(2, 100) @Matches(/\S/) country: string;
}
export class PayHereStartDto extends StartPaymentDto {
  @ApiProperty({ type: BillingDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => BillingDto)
  billing: BillingDto;
}
