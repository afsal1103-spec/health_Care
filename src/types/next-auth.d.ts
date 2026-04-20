import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface User {
    userType?: string;
    roleDetails?: any;
  }
  
  interface Session {
    user: {
      id?: string;
      userType?: string;
      roleDetails?: any;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userType?: string;
    roleDetails?: any;
  }
}