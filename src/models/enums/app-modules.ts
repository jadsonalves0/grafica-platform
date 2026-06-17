export const APP_MODULES = [
  "companies",
  "users",
  "customers",
  "inventory",
  "quotes",
  "orders",
  "financial",
  "site",
] as const;

export type AppModule = (typeof APP_MODULES)[number];
