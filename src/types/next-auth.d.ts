import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    invalid?: boolean;
  }

  interface Session extends DefaultSession {
    user?: DefaultSession["user"] & {
      id: string;
      invalid?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    sub?: string;
    name?: string | null;
    invalid?: boolean;
  }
}
