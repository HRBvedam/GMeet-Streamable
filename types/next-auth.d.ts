import NextAuth from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    error?: string
    user: {
      id: string
      googleId?: string
      name?: string | null
      email?: string | null
      image?: string | null
      givenName?: string
      familyName?: string
      phoneNumbers?: Array<{
        value: string
        type?: string
      }>
    }
  }

  interface User {
    googleId?: string
    givenName?: string
    familyName?: string
  }

  interface Profile {
    sub: string
    name?: string
    email?: string
    picture?: string
    given_name?: string
    family_name?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    googleId?: string
    givenName?: string
    familyName?: string
    accessTokenExpires?: number
    error?: string
  }
}


