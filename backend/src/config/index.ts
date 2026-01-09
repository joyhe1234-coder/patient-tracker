export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'development_jwt_secret_change_in_production',
  jwtExpiresIn: '8h',

  // Edit lock timeout in minutes
  lockTimeoutMinutes: 5,

  // Heartbeat interval in milliseconds
  heartbeatInterval: 2 * 60 * 1000, // 2 minutes
};
