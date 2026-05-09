import { Controller, Get, Head } from "@nestjs/common";

@Controller()
export class HealthController {
  @Get()
  root() {
    return {
      ok: true,
      status: "UP",
      service: "motorxlive-api",
      timestamp: new Date().toISOString(),
    };
  }

  @Head()
  rootHead() {
    return;
  }

  @Get("health")
  health() {
    return {
      ok: true,
      status: "UP",
      service: "motorxlive-api",
      timestamp: new Date().toISOString(),
    };
  }

  @Head("health")
  healthHead() {
    return;
  }
}