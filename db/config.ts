/**
 * Connection configuration utilities for Drizzle.
 * Handles SSL detection, localhost tunnels, and connection pooling.
 */

export interface ConnectionConfig {
    ssl: boolean | { rejectUnauthorized: boolean };
    maxConnections: number;
    isLocal: boolean;
}

/**
 * Detects optimal connection settings based on DATABASE_URL.
 */
export function getConnectionConfig(url: string): ConnectionConfig {
    const isProduction = process.env.NODE_ENV === "production";

    try {
        const parsed = new URL(url);
        const isLocal =
            parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
        const sslDisabled =
            url.toLowerCase().includes("sslmode=disable") ||
            process.env.PGSSLMODE === "disable";

        if (isLocal || sslDisabled) {
            console.log(
                `[db] Connecting to ${parsed.hostname}:${parsed.port} (SSL disabled)`,
            );
            return {
                ssl: false,
                maxConnections: isProduction ? 20 : 5,
                isLocal,
            };
        }

        console.log(
            `[db] Connecting to ${parsed.hostname}:${parsed.port} (SSL enabled)`,
        );
        return {
            ssl: { rejectUnauthorized: false },
            maxConnections: isProduction ? 20 : 10,
            isLocal: false,
        };
    } catch {
        // If URL parsing fails, assume remote with SSL
        console.warn("[db] Could not parse DATABASE_URL, using SSL defaults");
        return {
            ssl: { rejectUnauthorized: false },
            maxConnections: 10,
            isLocal: false,
        };
    }
}
