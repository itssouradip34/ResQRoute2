import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const EXOTEL_ACCOUNT_SID = Deno.env.get("EXOTEL_ACCOUNT_SID")!;
const EXOTEL_API_KEY = Deno.env.get("EXOTEL_API_KEY")!;
const EXOTEL_API_TOKEN = Deno.env.get("EXOTEL_API_TOKEN")!;
const EXOTEL_CALLER_ID = Deno.env.get("EXOTEL_CALLER_ID")!; // your ExoPhone, e.g. 08047359243
const EXOTEL_APP_ID = Deno.env.get("EXOTEL_APP_ID")!; // e.g. 1323304 (the flow that speaks the alert)
const EXOTEL_SUBDOMAIN = Deno.env.get("EXOTEL_SUBDOMAIN") || "api.exotel.com";

serve(async (req) => {
  try {
    const { recipients } = await req.json();

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing recipients" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const auth = "Basic " + btoa(`${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}`);
    const url = `https://${EXOTEL_SUBDOMAIN}/v1/Accounts/${EXOTEL_ACCOUNT_SID}/Calls/connect`;

    const results = await Promise.all(
      recipients.map(async (to: string) => {
        const body = new URLSearchParams({
          From: to,
          CallerId: EXOTEL_CALLER_ID,
          Url: `http://my.exotel.com/exoml/start_voice/${EXOTEL_APP_ID}`,
        });

        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: auth,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
        });

        const text = await res.text();
        return { to, ok: res.ok, raw: text };
      })
    );

    const allOk = results.every((r) => r.ok);
    return new Response(JSON.stringify({ success: allOk, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
