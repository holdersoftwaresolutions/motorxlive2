import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.motorxlive_access_token;

    const bearerToken =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

    const token = bearerToken || cookieToken;

    if (!token) {
      throw new UnauthorizedException("Missing auth token");
    }

    const payload = await this.auth.verifyAccessToken(token);
    req.user = payload;
    return true;
  }
}