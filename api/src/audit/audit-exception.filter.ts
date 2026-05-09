import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { AuditService } from "./audit.service";

@Catch()
export class AuditExceptionFilter implements ExceptionFilter {
  constructor(private readonly audit: AuditService) {}

  async catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();

    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      null;

    const userAgent = req.headers["user-agent"] || null;

    const path = req.url;
    const method = req.method;

    let status = 500;
    let message = "Internal server error";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      message = res?.message || exception.message;
    }

    // 🔥 ONLY log important security events
    if (
      exception instanceof UnauthorizedException ||
      exception instanceof ForbiddenException ||
      status === 401 ||
      status === 403
    ) {
      await this.audit.security({
        eventType: "UNAUTHORIZED_ACCESS_ATTEMPT",
        severity: "WARN",
        ipAddress: Array.isArray(ip) ? ip[0] : ip,
        userAgent,
        path,
        method,
        message,
        metadata: {
          status,
        },
      });
    }

    throw exception;
  }
}