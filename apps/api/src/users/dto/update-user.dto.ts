import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

/** Documented as the UpdateUser schema in create-user.dto.ts. */
export class UpdateUserDto extends PartialType(CreateUserDto) {}
