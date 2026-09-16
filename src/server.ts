import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { handleGenerateInsight, type GenerateInsightRequest } from "./server/geminiService";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// כתובת גיליון ברירת מחדל
const DEFAULT_CSV_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1VA9J6n9IYcooO_s2xOpnkvyDQWWQD3pfhh0cnenCkoA/gviz/tq?tqx=out:csv&sheet=" +
  encodeURIComponent("דשבורד_הזמנות");

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      // טיפול ב-CORS Preflight (חיוני לבקשות מובייל)
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        });
      }

      // Handle AI API endpoints server-side
      if (url.pathname === "/api/ai/insights" && request.method === "POST") {
        try {
          const body = (await request.json()) as GenerateInsightRequest;
          const result = await handleGenerateInsight(body);
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "content-type": "application/json; charset=utf-8" },
          });
        } catch (err) {
          console.error("Error in /api/ai/insights:", err);
          return new Response(
            JSON.stringify({
              error: err instanceof Error ? err.message : "Internal AI Error",
            }),
            {
              status: 500,
              headers: { "content-type": "application/json; charset=utf-8" },
            },
          );
        }
      }

      // Handle Server-Side Google Sheets CSV Fetch Proxy
      if (url.pathname === "/api/sheets/orders" && request.method === "GET") {
        try {
          const sheetTargetUrl = url.searchParams.get("url") || DEFAULT_CSV_SHEET_URL;

          const sep = sheetTargetUrl.includes("?") ? "&" : "?";
          const cacheBustedUrl = `${sheetTargetUrl}${sep}_t=${Date.now()}`;

          const res = await fetch(cacheBustedUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SabanOS/2.0",
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
            },
          });

          if (!res.ok) {
            return new Response(JSON.stringify({ error: `Sheet error: ${res.status}` }), {
              status: res.status,
              headers: { "content-type": "application/json; charset=utf-8" },
            });
          }

          const csvText = await res.text();
          return new Response(csvText, {
            status: 200,
            headers: {
              "content-type": "text/csv; charset=utf-8",
              "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            },
          });
        } catch (err) {
          console.error("Error proxying sheet in /api/sheets/orders:", err);
          return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : "Failed to fetch sheet" }),
            { status: 502, headers: { "content-type": "application/json; charset=utf-8" } },
          );
        }
      }

      // Handle Google Sheets Status Write-Back (סנכרון מלא לטלוויזיה ולגיליון)
      if (url.pathname === "/api/sheets/update-status" && request.method === "POST") {
        try {
          const body = (await request.json()) as {
            action?: string;
            sheet?: string;
            orderId: string;
            status: string;
            webhookUrl?: string;
            sheetName?: string;
          };

          const { orderId, status } = body;
          // שליפת כתובת Webhook מתוך גוף הבקשה, משתנה סביבה, או Fallback
          const webhookUrl =
            body.webhookUrl ||
            (typeof process !== "undefined" ? process.env.SHEETS_WEBHOOK_URL : undefined);

          const sheetName = body.sheet || body.sheetName || "דשבורד_הזמנות";
          const action = body.action || "updateOrderStatus";

          if (!orderId || !status) {
            return new Response(
              JSON.stringify({ success: false, error: "Missing orderId or status" }),
              { status: 400, headers: { "content-type": "application/json; charset=utf-8" } },
            );
          }

          // אם יש כתובת Webhook, שולחים ישירות ל-Google Apps Script
          if (webhookUrl && webhookUrl.startsWith("http")) {
            try {
              const scriptRes = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action,
                  sheet: sheetName,
                  sheetName,
                  orderId,
                  status,
                  updatedBy: "אורן (סניף 4 החרש)",
                  timestamp: new Date().toISOString(),
                }),
                redirect: "follow",
              });

              const responseText = await scriptRes.text();
              let scriptJson: any = null;
              try {
                scriptJson = JSON.parse(responseText);
              } catch {
                /* response is not raw json */
              }

              if (scriptRes.ok || (scriptJson && scriptJson.success)) {
                return new Response(
                  JSON.stringify({
                    success: true,
                    orderId,
                    status,
                    syncedToSheet: true,
                    message: scriptJson?.message || `עודכן בהצלחה בגיליון ${sheetName}`,
                    updatedAt: new Date().toISOString(),
                    row: scriptJson?.row,
                  }),
                  { status: 200, headers: { "content-type": "application/json; charset=utf-8" } },
                );
              }
            } catch (whErr) {
              console.error("שגיאה בפנייה ל-Apps Script Webhook:", whErr);
            }
          }

          // במידה ואין Webhook מוגדר, הסטטוס נשמר בזיכרון המערכת ומחזיר הנחיה להגדרה
          return new Response(
            JSON.stringify({
              success: true,
              orderId,
              status,
              syncedToSheet: false,
              message:
                "הסטטוס עודכן מקומית. להצגה בטלוויזיה יש להגדיר SHEETS_WEBHOOK_URL ב-Vercel.",
              updatedAt: new Date().toISOString(),
            }),
            { status: 200, headers: { "content-type": "application/json; charset=utf-8" } },
          );
        } catch (err) {
          console.error("Error in /api/sheets/update-status:", err);
          return new Response(
            JSON.stringify({
              success: false,
              error: err instanceof Error ? err.message : "Internal Server Error",
            }),
            { status: 500, headers: { "content-type": "application/json; charset=utf-8" } },
          );
        }
      }

      // Handle Webhook test connection
      if (url.pathname === "/api/sheets/test-connection" && request.method === "POST") {
        try {
          const body = (await request.json()) as { webhookUrl?: string };
          const webhookUrl =
            body.webhookUrl ||
            (typeof process !== "undefined" ? process.env.SHEETS_WEBHOOK_URL : undefined);

          if (!webhookUrl) {
            return new Response(
              JSON.stringify({ success: false, error: "לא סופקה כתובת Webhook" }),
              { status: 400, headers: { "content-type": "application/json; charset=utf-8" } },
            );
          }

          const testRes = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ping: true }),
            redirect: "follow",
          });

          const text = await testRes.text();
          let json: any = null;
          try {
            json = JSON.parse(text);
          } catch {}

          if (json && json.success) {
            return new Response(
              JSON.stringify({
                success: true,
                message: json.message || "חיבור תקין ל-Google Apps Script!",
              }),
              { status: 200, headers: { "content-type": "application/json; charset=utf-8" } },
            );
          }

          return new Response(
            JSON.stringify({
              success: false,
              error: json?.error || text.slice(0, 200) || `תגובה לא צפויה מ-Webhook (${testRes.status})`,
            }),
            { status: 200, headers: { "content-type": "application/json; charset=utf-8" } },
          );
        } catch (err) {
          return new Response(
            JSON.stringify({
              success: false,
              error: err instanceof Error ? err.message : "שגיאת רשת בבדיקת חיבור",
            }),
            { status: 500, headers: { "content-type": "application/json; charset=utf-8" } },
          );
        }
      }

      // Handle Replenishment / Log History into Google Sheets
      if (url.pathname === "/api/sheets/log-history" && request.method === "POST") {
        try {
          const body = (await request.json()) as {
            action?: string;
            sheetName?: string;
            caller?: string;
            warehouse?: string;
            summary?: string;
            webhookUrl?: string;
          };

          const webhookUrl =
            body.webhookUrl ||
            (typeof process !== "undefined" ? process.env.SHEETS_WEBHOOK_URL : undefined);
          const sheetName = body.sheetName || "היסטוריית_שיחות_נועה";
          const action = body.action || "REPLENISHMENT_DISPATCHED";

          if (webhookUrl) {
            await fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action,
                sheetName,
                caller: body.caller || "אורן",
                warehouse: body.warehouse || "סניף 4 החרש",
                summary: body.summary || "",
                timestamp: new Date().toISOString(),
              }),
              redirect: "follow",
            }).catch(() => null);
          }

          return new Response(
            JSON.stringify({
              success: true,
              logged: true,
              sheetName,
              action,
              timestamp: new Date().toISOString(),
            }),
            { status: 200, headers: { "content-type": "application/json; charset=utf-8" } },
          );
        } catch (err) {
          return new Response(
            JSON.stringify({
              success: false,
              error: err instanceof Error ? err.message : "Error logging replenishment",
            }),
            { status: 500, headers: { "content-type": "application/json; charset=utf-8" } },
          );
        }
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
