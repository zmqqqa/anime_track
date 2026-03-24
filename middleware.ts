import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/", "/anime/:path*", "/api/anime/:path*", "/api/history/:path*"],
};
