import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing required Google OAuth environment variables')
}

// Function to refresh the access token
async function refreshAccessToken(token: any) {
  try {
    const url = "https://oauth2.googleapis.com/token"
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      throw refreshedTokens
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    }
  } catch (error) {
    console.error("Error refreshing access token:", error)
    return {
      ...token,
      error: "RefreshAccessTokenError",
    }
  }
}

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/user.phonenumbers.read',
            'https://www.googleapis.com/auth/calendar.events'  // NEW SCOPE ADDED
          ].join(' '),
          access_type: "offline",
          prompt: "consent",
        }
      }
    })
  ],
  
  callbacks: {
    async jwt({ token, account, profile }) {
      // Store access tokens on initial sign-in
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.googleId = account.providerAccountId
        token.accessTokenExpires = Date.now() + (account.expires_in as number) * 1000
      }

      if (profile) {
        token.googleId = profile.sub
        token.givenName = profile.given_name
        token.familyName = profile.family_name
      }

      if (token.accessTokenExpires && token.refreshToken) {
        if (Date.now() > (token.accessTokenExpires as number) - 5 * 60 * 1000) {
          console.log('Access token expired, refreshing...')
          return refreshAccessToken(token)
        }
      }

      return token
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.user.googleId = token.googleId as string
      session.user.givenName = token.givenName as string
      session.user.familyName = token.familyName as string
      session.error = token.error as string

      // Fetch phone numbers from Google People API
      if (token.accessToken && !token.error) {
        try {
          const response = await fetch(
            'https://people.googleapis.com/v1/people/me?personFields=phoneNumbers',
            {
              headers: {
                Authorization: `Bearer ${token.accessToken}`,
              },
            }
          )

          if (response.ok) {
            const data = await response.json()
            const phoneNumbers = data.phoneNumbers || []
            const uniquePhones = phoneNumbers.filter(
              (phone: any, index: number, self: any[]) =>
                index === self.findIndex((p: any) => p.value === phone.value)
            )
            session.user.phoneNumbers = uniquePhones
          } else {
            console.warn('Failed to fetch phone numbers:', response.status)
            session.user.phoneNumbers = []
          }
        } catch (error) {
          console.error('Error fetching phone numbers:', error)
          session.user.phoneNumbers = []
        }
      } else {
        session.user.phoneNumbers = []
      }

      return session
    }
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  }
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST, authOptions }