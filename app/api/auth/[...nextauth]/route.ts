// app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

interface UserRow extends RowDataPacket {
  id_user: number;
  nama: string;
  email: string;
  password: string;
  role: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          const [rows] = await pool.query<UserRow[]>(
            "SELECT id_user, nama, email, password, role FROM users WHERE email = ? LIMIT 1",
            [credentials.email]
          )

          const user = rows[0]
          if (!user) {
            // ← Lempar error spesifik, bukan return null
            throw new Error('EMAIL_NOT_FOUND')
          }

          const passwordMatch = await bcrypt.compare(credentials.password, user.password)
          if (!passwordMatch) {
            throw new Error('WRONG_PASSWORD')
          }

          return {
            id: String(user.id_user),
            name: user.nama,
            email: user.email,
            role: user.role,
          }
        } catch (error: any) {
          // Re-throw error spesifik kita, bukan tangkap semua
          if (error.message === 'EMAIL_NOT_FOUND' || error.message === 'WRONG_PASSWORD') {
            throw error
          }
          console.error('❌ Auth error:', error)
          throw new Error('SERVER_ERROR')
        }
      },
    }),
  ],

  callbacks: {
    // Simpan role ke dalam JWT token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    // Expose role ke session (bisa diakses di client)
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
      }
      return session;
    },
    // Redirect setelah login berdasarkan role
    async redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },

  pages: {
    signIn: "/login",    // halaman login custom
    error: "/login",     // error redirect ke login juga
  },

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8 jam
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };