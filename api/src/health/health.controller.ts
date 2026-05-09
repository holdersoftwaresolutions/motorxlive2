import { Controller, Get, Head } from "@nestjs/common";

@Controller()
export class HealthController {
  private response() {
    return {
      ok: true,
      status: "UP",
      service: "motorxlive-api",
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  root() {
    return this.response();
  }

  @Head()
  rootHead() {
    return;
  }

  @Get("health")
  health() {
    return this.response();
  }

  @Head("health")
  healthHead() {
    return;
  }

  @Get("healthz")
  healthz() {
    return this.response();
  }

  @Head("healthz")
  healthzHead() {
    return;
  }
}