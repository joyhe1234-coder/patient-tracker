export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'development_jwt_secret_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',

  // Bcrypt salt rounds for password hashing
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),

  // Edit lock timeout in minutes
  lockTimeoutMinutes: 5,

  // Heartbeat interval in milliseconds
  heartbeatInterval: 2 * 60 * 1000, // 2 minutes
};
