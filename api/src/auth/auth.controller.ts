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

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

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

  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post("login")
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.validateUser(dto.email, dto.password);
    const { accessToken, refreshToken } = await this.auth.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    this.setAuthCookies(res, accessToken, refreshToken);

    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60 } })
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