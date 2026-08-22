import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER")!;

serve(async (req) => {
  try {
    const { recipients, message } = await req.json();

    if (!Array.isArray(recipients) || recipients.length === 0 || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing recipients or message" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const results = await Promise.all(
      recipients.map(async (to: string) => {
        const body = new URLSearchParams({
          To: to,
          From: TWILIO_FROM_NUMBER,
          Body: message,
        });

        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization:
                "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body,
          }
        );

        const data = await res.json();
        return { to, ok: res.ok, sid: data.sid, error: data.message };
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