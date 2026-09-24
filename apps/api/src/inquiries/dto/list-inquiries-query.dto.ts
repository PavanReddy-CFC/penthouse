import { InquiryStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class ListInquiriesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(InquiryStatus)
  status?: InquiryStatus;

  @IsOptional()
  @IsString()
  listingId?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
