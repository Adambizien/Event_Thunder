export class UserResponseDto {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  phoneNumber?: string | null;
  role?: string;
  planId?: string;
}
