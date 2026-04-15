export const DATABASE_NAME = "batsir.db";

export const initDatabase = async () => {
  // SQLite is not directly available in standard web without extra configuration
  // For web, we usually mock or use a different adapter.
  // In Expo 51+, expo-sqlite handles web via an Op-SQLite or similar wrapper if configured.
  return null;
};

export const getDb = async () => {
  return null;
};
