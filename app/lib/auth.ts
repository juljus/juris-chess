import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getPlayerByEmail } from "@/app/config/players";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Allow all Google sign-ins - the app will show appropriate UI
      return !!user.email;
    },
    async session({ session }) {
      // Add player role to session if they're a configured player
      if (session.user?.email) {
        const playerInfo = getPlayerByEmail(session.user.email);
        if (playerInfo) {
          (session as any).role = playerInfo.role;
          (session as any).boards = playerInfo.player.boards;
        }
      }
      return session;
    },
  },
};
