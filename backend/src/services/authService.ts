import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { config } from '../config/index.js';
import type { User, UserRole } from '@prisma/client';

// JWT payload structure
export interface JwtPayload {
  userId: number;
  email: string;
  username: string;
  role: UserRole;
}

// User info returned to frontend (without sensitive data)
export interface AuthUser {
  id: number;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
}

// Staff assignment info
export interface StaffAssignment {
  physicianId: number;
  physicianName: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.bcryptSaltRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: Pick<User, 'id' | 'email' | 'username' | 'role'>): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Find a user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email },
  });
}

/**
 * Find a user by ID
 */
export async function findUserById(id: number): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  });
}

/**
 * Find a user by username
 */
export async function findUserByUsername(username: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { username },
  });
}

/**
 * Update user's last login timestamp
 */
export async function updateLastLogin(userId: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}

/**
 * Update user's password
 */
export async function updatePassword(userId: number, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

/**
 * Get user info for frontend (without sensitive data)
 */
export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
  };
}

/**
 * Get staff assignments (physicians a STAFF user can cover)
 */
export async function getStaffAssignments(staffId: number): Promise<StaffAssignment[]> {
  const assignments = await prisma.staffAssignment.findMany({
    where: { staffId },
    include: {
      physician: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  });

  return assignments.map((a) => ({
    physicianId: a.physician.id,
    physicianName: a.physician.displayName,
  }));
}

/**
 * Check if a STAFF user is assigned to a specific physician
 */
export async function isStaffAssignedToPhysician(staffId: number, physicianId: number): Promise<boolean> {
  const assignment = await prisma.staffAssignment.findUnique({
    where: {
      staffId_physicianId: {
        staffId,
        physicianId,
      },
    },
  });
  return assignment !== null;
}

/**
 * Authenticate a user with email and password
 * Returns the user and token if successful, null otherwise
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<{ user: AuthUser; token: string; assignments?: StaffAssignment[] } | null> {
  // Find user by email
  const user = await findUserByEmail(email);
  if (!user) {
    return null;
  }

  // Check if user is active
  if (!user.isActive) {
    return null;
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    return null;
  }

  // Update last login
  await updateLastLogin(user.id);

  // Generate token
  const token = generateToken(user);

  // Get staff assignments if user is STAFF
  let assignments: StaffAssignment[] | undefined;
  if (user.role === 'STAFF') {
    assignments = await getStaffAssignments(user.id);
  }

  return {
    user: toAuthUser(user),
    token,
    assignments,
  };
}
