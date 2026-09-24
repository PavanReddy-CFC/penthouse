import { Module } from '@nestjs/common';
import { ListingSearchService } from './listing-search.service';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

@Module({
  controllers: [ListingsController],
  providers: [ListingsService, ListingSearchService],
})
export class ListingsModule {}
