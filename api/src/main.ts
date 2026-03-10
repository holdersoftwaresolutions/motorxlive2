import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import * as express from "express";
import * as cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

function ensureSslModeRequire(url: string): string {
  const u = new URL(url);
  if (!u.searchParams.get("sslmode")) u.searchParams.set("sslmode", "require");
  return u.toString();
}

async function bootstrap() {
  if (
    process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes("sslmode=disable")
  ) {
    process.env.DATABASE_URL = ensureSslModeRequire(process.env.DATABASE_URL);
  }

  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString("utf8");
      },
    })
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001);
}
bootstrap();