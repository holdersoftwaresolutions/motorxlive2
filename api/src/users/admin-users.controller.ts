import { Controller, Param, Post, UseGuards } from "@nestjs/common";
import { hash } from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { Get } from "@nestjs/common";

function generateTemporaryPassword() {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MXL-${part()}-${part()}-${part()}`;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/users")
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService) {}

    @Get()
    async listUsers() {
        return this.prisma.user.findMany({
        orderBy: {
            createdAt: "desc",
        },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
        },
        take: 500,
        });
    }

  @Post(":id/reset-password")
  async resetPassword(@Param("id") id: string) {
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hash(temporaryPassword, 10);

    const user = await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    return {
      ok: true,
      user,
      temporaryPassword,
      message: "Temporary password generated. It will only be shown once.",
    };
  }
}