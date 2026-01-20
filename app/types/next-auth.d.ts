import { DefaultSession } from "next-auth";
import { PlayerRole } from "@/app/config/players";

declare module "next-auth" {
  interface Session extends DefaultSession {
    role?: PlayerRole;
    boards?: readonly number[];
  }
}
