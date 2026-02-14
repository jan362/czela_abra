import bcrypt from "bcryptjs";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

interface UserStore {
  users: User[];
}

// ─── Configuration ───────────────────────────────────────────────────────────

const SALT_ROUNDS = 10;

// Lazy-load Node.js modules only when needed (avoids Edge Runtime issues)
let fs: typeof import("fs") | null = null;
let path: typeof import("path") | null = null;

function ensureNodeModules() {
  if (!fs || !path) {
    fs = require("fs");
    path = require("path");
  }
  return { fs: fs!, path: path! };
}

function getFilePaths() {
  const { fs: fsModule, path: pathModule } = ensureNodeModules();
  const DATA_DIR = pathModule.join(process.cwd(), "data");
  const USERS_FILE = pathModule.join(DATA_DIR, "users.json");
  return { DATA_DIR, USERS_FILE, fs: fsModule };
}

// ─── User Store Management ──────────────────────────────────────────────────

/**
 * Initialize user store with default admin if it doesn't exist
 */
export async function initializeUserStore(): Promise<void> {
  try {
    const { DATA_DIR, USERS_FILE, fs: fsModule } = getFilePaths();

    // Create data directory if it doesn't exist
    if (!fsModule.existsSync(DATA_DIR)) {
      fsModule.mkdirSync(DATA_DIR, { recursive: true });
    }

    // If users.json already exists, don't overwrite
    if (fsModule.existsSync(USERS_FILE)) {
      return;
    }

    // Get default password from environment
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || "changeme123";

    // Hash the password
    const passwordHash = await hashPassword(defaultPassword);

    // Create default admin user
    const defaultStore: UserStore = {
      users: [
        {
          id: "1",
          username: "admin",
          passwordHash,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    // Write to file
    fsModule.writeFileSync(USERS_FILE, JSON.stringify(defaultStore, null, 2), "utf-8");

    console.log("[Auth] User store initialized with default admin user");
  } catch (error) {
    console.error("[Auth] Failed to initialize user store:", error);
    throw error;
  }
}

/**
 * Read user store from file
 */
function readUserStore(): UserStore {
  try {
    const { USERS_FILE, fs: fsModule } = getFilePaths();

    if (!fsModule.existsSync(USERS_FILE)) {
      return { users: [] };
    }

    const data = fsModule.readFileSync(USERS_FILE, "utf-8");
    const store = JSON.parse(data) as UserStore;

    // Validate structure
    if (!store.users || !Array.isArray(store.users)) {
      console.error("[Auth] Invalid user store structure");
      return { users: [] };
    }

    return store;
  } catch (error) {
    console.error("[Auth] Failed to read user store:", error);
    return { users: [] };
  }
}

/**
 * Write user store to file
 */
function writeUserStore(store: UserStore): void {
  try {
    const { USERS_FILE, fs: fsModule } = getFilePaths();
    fsModule.writeFileSync(USERS_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (error) {
    console.error("[Auth] Failed to write user store:", error);
    throw error;
  }
}

// ─── User Operations ────────────────────────────────────────────────────────

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  const store = readUserStore();
  const user = store.users.find((u) => u.username === username);
  return user || null;
}

/**
 * Create a new user (for future user management)
 */
export async function createUser(username: string, password: string): Promise<User> {
  const store = readUserStore();

  // Check if user already exists
  if (store.users.some((u) => u.username === username)) {
    throw new Error(`User ${username} already exists`);
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create new user
  const newUser: User = {
    id: String(store.users.length + 1),
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  // Add to store
  store.users.push(newUser);
  writeUserStore(store);

  console.log(`[Auth] Created user: ${username}`);

  return newUser;
}

/**
 * Update user password (for future password reset)
 */
export async function updateUserPassword(
  username: string,
  newPassword: string
): Promise<void> {
  const store = readUserStore();
  const user = store.users.find((u) => u.username === username);

  if (!user) {
    throw new Error(`User ${username} not found`);
  }

  // Hash new password
  user.passwordHash = await hashPassword(newPassword);

  writeUserStore(store);

  console.log(`[Auth] Updated password for user: ${username}`);
}

// ─── Password Utilities ─────────────────────────────────────────────────────

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Auto-initialization ────────────────────────────────────────────────────

// Note: Auto-initialization is disabled to avoid Edge Runtime issues.
// Initialize manually in API routes or server components that need it.
