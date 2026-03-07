const API = process.env.API_BASE_URL || "http://localhost:3000";

module.exports = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API}/:path*` }];
  },
};
