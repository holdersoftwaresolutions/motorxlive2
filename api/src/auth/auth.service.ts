import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare } from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";

type JwtUser = {
  id: string;
  email: string;
  role: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  async validateUser(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const dbUrl = process.env.DATABASE_URL || "";
    try {
      const parsed = new URL(dbUrl);
      console.log("DB_HOST:", parsed.hostname);
      console.log("DB_NAME:", parsed.pathname);
    } catch {
    console.log("DB_URL_PARSE_FAILED"); 
    }
    console.log("LOGIN_EMAIL_RAW:", email);
    console.log("LOGIN_EMAIL_NORMALIZED:", normalizedEmail);
    console.log("LOGIN_PASSWORD_LENGTH:", password?.length ?? 0);

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    console.log("USER_FOUND:", !!user);
    console.log("USER_ACTIVE:", user?.isActive);
    console.log("USER_ROLE:", user?.role);

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const ok = await compare(password, user.passwordHash);
    console.log("PASSWORD_MATCH:", ok);

    if (!ok) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return user;
  }

  async issueTokens(user: JwtUser) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: "15m",
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: "30d",
    });

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string) {
    return this.jwt.verifyAsync(token, {
      secret: process.env.JWT_ACCESS_SECRET,
    });
  }

  async verifyRefreshToken(token: string) {
    return this.jwt.verifyAsync(token, {
      secret: process.env.JWT_REFRESH_SECRET,
    });
  }
}