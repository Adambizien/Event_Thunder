import { IsEnum, IsUUID } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class UpdateRoleDto {
  @IsUUID()
  userId: string;

  @IsEnum(UserRole)
  role: UserRole;
}
