import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UserPayload {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  supabaseUserId?: string;
  role?: string;
}

export const CurrentUserFactory = (
  data: keyof UserPayload | undefined,
  ctx: ExecutionContext,
): UserPayload | any => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;

  return data && user ? user[data] : user;
};

export const CurrentUser = createParamDecorator(CurrentUserFactory);
