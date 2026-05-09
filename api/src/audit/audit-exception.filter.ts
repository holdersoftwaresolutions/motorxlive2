import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
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
    const res = ctx.getResponse();

    const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null;
    const userAgent = req.headers["user-agent"] || null;

    const path = req.url;
    const method = req.method;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = "Internal server error";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse() as any;
      message = response?.message || exception.message;
    }

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
        message: Array.isArray(message) ? message.join(", ") : String(message),
        metadata: { status },
      });
    }

    return res.status(status).json({
      statusCode: status,
      message,
      error: status === 500 ? "Internal Server Error" : undefined,
    });
  }
}