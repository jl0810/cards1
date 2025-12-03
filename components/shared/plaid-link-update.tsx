"use client";

import { useState, useEffect, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface PlaidLinkUpdateProps {
  itemId: string;
  institutionName: string;
  onSuccess: () => void;
  variant?: "default" | "outline" | "destructive";
  size?: "default" | "sm" | "lg";
  className?: string;
}

/**
 * Plaid Link Update Mode Component
 *
 * Launches Plaid Link in update mode to fix broken Items.
 * Used when an Item has ITEM_LOGIN_REQUIRED or other errors.
 *
 * @implements BR-035 - Item Error Detection & Recovery
 * @satisfies US-020 - Monitor Bank Connection Health
 * @see https://plaid.com/docs/link/update-mode/
 */
export function PlaidLinkUpdate({
  itemId,
  institutionName,
  onSuccess,
  variant = "destructive",
  size = "default",
  className,
}: PlaidLinkUpdateProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch update mode link token
  const fetchLinkToken = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/plaid/link-token/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create link token");
      }

      const data = await response.json();
      setLinkToken(data.link_token);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      logger.error("Failed to fetch update mode link token", {
        itemId,
        error: errorMessage,
      });
      setError(errorMessage);
      toast.error("Failed to initialize connection update", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  // Fetch link token on mount
  useEffect(() => {
    fetchLinkToken();
  }, [fetchLinkToken]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: () => {
      logger.info("Item successfully updated via Link", {
        itemId,
        institutionName,
      });
      toast.success(`${institutionName} connection updated!`, {
        description: "Your bank connection is now working again.",
      });
      onSuccess();
    },
    onExit: (err, metadata) => {
      if (err) {
        logger.error("Link update mode exited with error", {
          itemId,
          error: err,
          metadata,
        });
        toast.error("Connection update failed", {
          description: err.error_message || "Please try again.",
        });
      } else {
        logger.info("Link update mode exited without completion", {
          itemId,
          metadata,
        });
      }
    },
  });

  const handleClick = () => {
    if (ready && linkToken) {
      open();
    } else if (error) {
      // Retry fetching link token
      fetchLinkToken();
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading || (!ready && !error)}
      variant={variant}
      size={size}
      className={`gap-2 ${className || ""}`}
    >
      {loading ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : error ? (
        <>
          <AlertCircle className="h-4 w-4" />
          Retry
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" />
          Fix Connection
        </>
      )}
    </Button>
  );
}
