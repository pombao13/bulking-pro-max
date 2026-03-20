// ═══════════════════════════════════════════════════════════════
// Supabase Edge Function: send-notifications
// Roda via cron a cada minuto — dispara push nas horas das refeições
// ═══════════════════════════════════════════════════════════════
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC  = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contato@bulkingpro.app";

// ── VAPID JWT gerado manualmente (sem lib externa) ─────────────
function b64url(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function b64urlDecode(s: string) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

async function makeVapidJWT(audience: string): Promise<string> {
  const header  = { alg: "ES256", typ: "JWT" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT,
  };
  const enc = new TextEncoder();
  const h = b64url(enc.encode(JSON.stringify(header)).buffer);
  const p = b64url(enc.encode(JSON.stringify(payload)).buffer);
  const sigInput = enc.encode(`${h}.${p}`);

  // Importa chave ECDSA P-256
  const rawPriv = b64urlDecode(VAPID_PRIVATE);
  const privKey = await crypto.subtle.importKey(
    "jwk",
    { kty:"EC", crv:"P-256", d: VAPID_PRIVATE,
      x: VAPID_PUBLIC.slice(0,43), y: VAPID_PUBLIC.slice(43,86) },
    { name:"ECDSA", namedCurve:"P-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign({ name:"ECDSA", hash:"SHA-256" }, privKey, sigInput);
  return `${h}.${p}.${b64url(sig)}`;
}

// ── Envia Web Push para um endpoint ───────────────────────────
async function sendPush(sub: {endpoint:string; p256dh:string; auth_key:string},
                        payload: object) {
  const url    = new URL(sub.endpoint);
  const origin = `${url.protocol}//${url.hostname}`;
  const jwt    = await makeVapidJWT(origin);

  const body = JSON.stringify(payload);
  const enc  = new TextEncoder();

  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `vapid t=${jwt},k=${VAPID_PUBLIC}`,
      "TTL": "86400",
    },
    body,
  });
  return res.status;
}

// ── Horários das refeições por fase/tipo (espelha o front) ─────
const MEAL_TIMES: Record<string, Record<string, string[]>> = {
  trabalho: {
    "1":["12:30","15:30","18:00","23:00","03:00","06:30"],
    "2":["12:30","15:30","18:00","23:00","03:00","06:30"],
    "3":["12:30","15:30","18:00","23:00","03:00","06:30"],
    "4":["12:30","15:30","18:00","23:00","03:00","06:30"],
    "5":["12:30","15:30","18:00","23:00","03:00","06:30"],
    "6":["12:30","15:30","18:00","23:00","03:00","06:30"],
    "7":["12:30","15:30","18:00","23:00","03:00","06:30"],
  },
  folga: {
    "1":["08:30","11:30","16:30","20:00","22:30"],
    "2":["08:30","11:30","16:30","20:00","22:30"],
    "3":["08:30","11:30","16:30","20:00","22:30"],
    "4":["08:30","11:30","16:30","20:00","22:30"],
    "5":["08:30","11:30","16:30","20:00","22:30"],
    "6":["08:30","11:30","16:30","20:00","22:30"],
    "7":["08:30","11:30","16:30","20:00","22:30"],
  }
};

// ── Nomes das refeições ────────────────────────────────────────
const MEAL_NAMES: Record<string, string[]> = {
  trabalho: ["Arroz + Frango","Shake","Macarrão","Purê + Ovos","Arroz (madrugada)","Macarrão (manhã)"],
  folga:    ["Shake","Arroz + Frango","Purê + Ovos","Macarrão","Arroz + Banana"],
};

// ── Handler principal ──────────────────────────────────────────
Deno.serve(async (req) => {
  // Suporte a invocação por cron (GET) e teste manual (POST)
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Hora atual em Brasília (UTC-3)
  const now     = new Date();
  const brOffset = -3 * 60;
  const brMs    = now.getTime() + (now.getTimezoneOffset() + brOffset) * 60000;
  const brNow   = new Date(brMs);
  const hh      = String(brNow.getHours()).padStart(2, "0");
  const mm      = String(brNow.getMinutes()).padStart(2, "0");
  const currentTime = `${hh}:${mm}`;
  const today   = brNow.toISOString().slice(0, 10);

  // Busca todas as subscriptions
  const { data: subs, error } = await sb
    .from("push_subscriptions")
    .select("*");

  if (error || !subs?.length) {
    return new Response(JSON.stringify({ time: currentTime, subs: 0 }), { status: 200 });
  }

  let sent = 0;
  const results: string[] = [];

  for (const sub of subs) {
    const fase = String(sub.fase || "1");
    const tipo = sub.tipo || "trabalho";
    const times = MEAL_TIMES[tipo]?.[fase] || [];

    if (!times.includes(currentTime)) continue;

    // Verifica se a refeição já foi marcada como concluída
    const mealIdx = times.indexOf(currentTime);
    const { data: check } = await sb
      .from("meal_checks")
      .select("id")
      .eq("user_id", sub.user_id)
      .eq("data", today)
      .eq("fase", fase)
      .eq("tipo", tipo)
      .eq("meal_idx", mealIdx)
      .maybeSingle();

    if (check) continue; // já concluída, não notifica

    const mealName = MEAL_NAMES[tipo]?.[mealIdx] || "Refeição";

    try {
      const status = await sendPush(sub, {
        title: "🍽️ Hora de comer!",
        body:  `${currentTime} — ${mealName}`,
        icon:  "/icon-192.png",
        badge: "/icon-notif.png",
        tag:   `meal-${mealIdx}`,
        url:   "/",
      });
      results.push(`${sub.user_id.slice(0,8)} → ${status}`);
      if (status < 300) sent++;
      // Remove subscription inválida
      if (status === 410 || status === 404) {
        await sb.from("push_subscriptions").delete().eq("id", sub.id);
      }
    } catch (e) {
      results.push(`${sub.user_id.slice(0,8)} → error: ${e}`);
    }
  }

  // ── Notificação de água (a cada hora cheia) ────────────────
  if (mm === "00") {
    const { data: waterSubs } = await sb
      .from("push_subscriptions")
      .select("*");

    for (const sub of (waterSubs || [])) {
      const { data: waterToday } = await sb
        .from("water_log")
        .select("ml")
        .eq("user_id", sub.user_id)
        .eq("data", today);

      const total = (waterToday || []).reduce((s: number, w: {ml:number}) => s + w.ml, 0);
      if (total >= 3000) continue; // meta atingida

      // Última entrada de água
      const { data: lastWater } = await sb
        .from("water_log")
        .select("created_at")
        .eq("user_id", sub.user_id)
        .eq("data", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastMs = lastWater ? new Date(lastWater.created_at).getTime() : 0;
      const diffMin = (Date.now() - lastMs) / 60000;

      if (diffMin < 55) continue; // bebeu há menos de 55min

      const remaining = 3000 - total;
      try {
        await sendPush(sub, {
          title: "💧 Beba água!",
          body:  `Faltam ${remaining}ml para sua meta. Hidrate-se! 🚰`,
          icon:  "/icon-192.png",
          badge: "/icon-notif.png",
          tag:   "water",
          url:   "/",
        });
        sent++;
      } catch (_) { /* ignora */ }
    }
  }

  return new Response(
    JSON.stringify({ time: currentTime, processed: subs.length, sent, results }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
