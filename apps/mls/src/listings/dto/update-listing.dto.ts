import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateListingDto } from './create-listing.dto';

/** Documented as the UpdateListing schema in create-listing.dto.ts. */
export class UpdateListingDto extends PartialType(OmitType(CreateListingDto, ['mlsNumber'] as const)) {}
