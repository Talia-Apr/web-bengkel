import { NextAuthOptions, DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import pool from "@/lib/db"; // Menggunakan pool yang sudah kamu buat
import { RowDataPacket } from "mysql2";

// 1. Deklarasi tipe agar TypeScript mengenali 'role'
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}

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
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const [rows] = await pool.query<UserRow[]>(
            "SELECT id_user, nama, email, password, role FROM users WHERE email = ? LIMIT 1",
            [credentials.email]
          );

          const user = rows[0];
          if (!user) throw new Error('EMAIL_NOT_FOUND');

          // Gunakan bcrypt untuk mengecek password yang di-hash
          const passwordMatch = await bcrypt.compare(credentials.password, user.password);
          if (!passwordMatch) throw new Error('WRONG_PASSWORD');

          return {
            id: String(user.id_user),
            name: user.nama,
            email: user.email,
            role: user.role,
          };
        } catch (error: any) {
          console.error('❌ Auth error:', error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8 jam
  },
  secret: process.env.NEXTAUTH_SECRET,
};