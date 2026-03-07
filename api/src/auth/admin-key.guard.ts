import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const providedKey = req.headers["x-admin-key"];
    const expectedKey = process.env.ADMIN_UI_KEY;

    if (!expectedKey) {
      throw new UnauthorizedException("ADMIN_UI_KEY is not configured");
    }

    if (!providedKey || Array.isArray(providedKey) || providedKey !== expectedKey) {
      throw new ForbiddenException("Invalid admin key");
    }

    return true;
  }
}