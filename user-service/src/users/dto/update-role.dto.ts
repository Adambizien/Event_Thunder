import { IsEnum, IsUUID } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateRoleDto {
  @IsUUID()
  userId: string;

  @IsEnum(UserRole)
  role: UserRole;
}
