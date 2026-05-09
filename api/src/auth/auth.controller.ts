import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { LoginDto } from "./auth.dto";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";
import { Throttle } from "@nestjs/throttler";
import { AuditService } from "../audit/audit.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly audit: AuditService
  ) {}

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string
  ) {
    const isProd = process.env.NODE_ENV === "production";

    res.cookie("motorxlive_access_token", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("motorxlive_refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("login")
  async login(
    @Req() req: any,
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      null;

    const userAgent = req.headers["user-agent"] || null;

    try {
      const user = await this.auth.validateUser(body.email, body.password);

      const { accessToken, refreshToken } = await this.auth.issueTokens({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      this.setAuthCookies(res, accessToken, refreshToken);

      await this.audit.audit({
        action: "AUTH_LOGIN_SUCCESS",
        actorType: user.role === "ADMIN" ? "ADMIN" : "USER",
        actorId: user.id,
        actorEmail: user.email,
        ipAddress: Array.isArray(ip) ? ip[0] : ip,
        userAgent,
        metadata: {
          email: body.email,
          role: user.role,
        },
      });

      return {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      };
    } catch (err: any) {
      await this.audit.security({
        eventType: "AUTH_LOGIN_FAILED",
        severity: "WARN",
        ipAddress: Array.isArray(ip) ? ip[0] : ip,
        userAgent,
        message: err?.message || "Login failed",
        metadata: {
          email: body?.email,
        },
      });

      throw err;
    }
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post("refresh")
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.motorxlive_refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException("Missing refresh token");
    }

    const payload = await this.auth.verifyRefreshToken(refreshToken);

    const { accessToken, refreshToken: newRefreshToken } =
      await this.auth.issueTokens({
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      });

    this.setAuthCookies(res, accessToken, newRefreshToken);

    return { ok: true };
  }

  @Post("logout")
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie("motorxlive_access_token", { path: "/" });
    res.clearCookie("motorxlive_refresh_token", { path: "/" });

    return { ok: true };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get("me")
  async me(@Req() req: any) {
    return {
      ok: true,
      user: req.user,
    };
  }
}