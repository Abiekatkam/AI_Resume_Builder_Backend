import prisma from '../../prisma/index.js';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:8080/api/v1/auth/google/callback",
  scope: ['profile', 'email'],
  passReqToCallback: true
}, async (request, accessToken, refreshToken, profile, done) => {
  try {
    const providerId = profile.id;
    const displayName = profile.displayName;
    const givenName = profile.name.givenName;
    const familyName = profile.name.familyName;
    const email = profile.emails?.[0]?.value; 
    const emailVerified = profile.emails?.[0]?.verified; 
    const photo = profile.photos?.[0]?.value; 
    const provider = profile.provider;

    const existingUser = await prisma.user.findUnique({
      where: { provider_id: providerId }
    });

    if (existingUser) {
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          displayName,
          givenName,
          familyName,
          email,
          emailVerified,
          photos: photo,
          provider :provider
        },
      });
      return done(null, updatedUser);
    } else {
      const newUser = await prisma.user.create({
        data: {
          provider_id: providerId,
          displayName,
          givenName,
          familyName,
          email,
          emailVerified,
          photos: photo,
          provider :provider
        },
      });
      return done(null, newUser);
    }
  } catch (error) {
    return done(error, false);
  }
}));

export default passport;
