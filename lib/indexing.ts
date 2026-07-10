import { google } from "googleapis";
import { db } from "@/db/drizzle";
import { indexingApiConfig, indexingLog } from "@/db/schema";
import crypto from "crypto";

export type IndexingType = "URL_UPDATED" | "URL_DELETED";

/**
 * Ensures an IndexNow key exists in the database. If not, generates one.
 */
export async function getOrGenerateIndexNowKey(): Promise<string> {
  return process.env.INDEXNOW_KEY || "";
}

/**
 * Core function to submit URLs to search engines depending on active config toggles.
 * Does not block execution (should be awaited without returning error to user if possible).
 */
export async function submitUrlForIndexing(url: string, type: IndexingType = "URL_UPDATED") {
  try {
    const [config] = await db.select().from(indexingApiConfig).limit(1);

    if (!config) return; // No config found

    // 1. Submit to Google Indexing API if enabled
    if (config.autoSubmitGoogle && config.googleServiceAccountJson) {
      await submitToGoogle(url, type, config.googleServiceAccountJson);
    }

    // 2. Submit to IndexNow if enabled
    if (config.autoSubmitIndexNow) {
      const indexNowKey = await getOrGenerateIndexNowKey();
      await submitToIndexNow(url, indexNowKey);
    }
  } catch (error) {
    console.error("[Indexing] Overall submission error:", error);
  }
}

/**
 * Submits URL to Google Indexing API
 */
async function submitToGoogle(url: string, type: IndexingType, serviceAccountJsonString: string) {
  try {
    const credentials = JSON.parse(serviceAccountJsonString);

    const jwtClient = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/indexing"],
    });

    // Authenticate
    await jwtClient.authorize();

    // Call Indexing API
    const res = await google.indexing("v3").urlNotifications.publish({
      auth: jwtClient,
      requestBody: {
        url: url,
        type: type, // "URL_UPDATED" or "URL_DELETED"
      },
    });

    const success = res.status === 200 || res.status === 202;

    await logSubmission(url, "Google", success ? "success" : "error", JSON.stringify(res.data));
  } catch (error: any) {
    console.error("[Indexing] Google API error:", error);
    await logSubmission(url, "Google", "error", error?.message || String(error));
  }
}

/**
 * Submits URL to IndexNow endpoint (Bing/Yandex/etc.)
 */
async function submitToIndexNow(url: string, key: string) {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.1onlysarkar.shop";
    const host = new URL(siteUrl).hostname; // e.g. "www.1onlysarkar.shop"
    
    // IndexNow allows the key to be hosted anywhere as long as we pass keyLocation
    const keyLocation = `${siteUrl}/api/indexnow-key`;

    const payload = {
      host: host,
      key: key,
      keyLocation: keyLocation,
      urlList: [url],
    };

    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const success = res.status === 200 || res.status === 202;
    let responseText = await res.text();

    await logSubmission(url, "IndexNow", success ? "success" : "error", `${res.status} ${responseText}`);
  } catch (error: any) {
    console.error("[Indexing] IndexNow error:", error);
    await logSubmission(url, "IndexNow", "error", error?.message || String(error));
  }
}

/**
 * Helper to log indexing submissions to the database
 */
async function logSubmission(url: string, api: "Google" | "IndexNow", status: "success" | "error", response: string) {
  try {
    await db.insert(indexingLog).values({
      id: crypto.randomUUID(),
      url,
      api,
      status,
      response: response.substring(0, 1000), // Prevent too long logs
    });
  } catch (logError) {
    console.error("[Indexing] Failed to write log to database:", logError);
  }
}
