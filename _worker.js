const FOLLOW_UPS = [
  {
    date: "2026-04-30",
    to: "support@polymaker.com",
    subject: "Re: Filament Partnership — Modology Studios",
    text: "Hi Polymaker team,\n\nJust following up on my note from last week about a filament partnership. Happy to share more details about what I'm building if it helps move things forward.\n\nThanks,\nMichael Flanigan\nModology Studios\nmichael@modologystudios.com",
  },
  {
    date: "2026-04-30",
    to: "affiliate@snapmaker.com",
    subject: "Re: Design Collab Inquiry — Modology Studios + Snapmate",
    text: "Hi Blayne,\n\nJust checking in on my email from last week about a design collab around Snapmate. I think there's a strong angle here — happy to discuss further whenever works for you.\n\nThanks,\nMichael Flanigan\nModology Studios\nmichael@modologystudios.com",
  },
  {
    date: "2026-04-30",
    to: "influencer@creality.com",
    subject: "Re: Maker Program Application — Modology Studios",
    text: "Hi Creality team,\n\nFollowing up on my email from last week about the Maker Program and the Spark X i7. Happy to provide more details about Modology Studios if that helps.\n\nThanks,\nMichael Flanigan\nModology Studios\nmichael@modologystudios.com",
  },
  {
    date: "2026-05-03",
    to: "info@fibreseek3d.com",
    subject: "Re: Creator Partnership — Modology Studios × FibreSeeker 3",
    text: "Hi Ryan,\n\nFollowing up on my email from last week — I'd love to explore a creator partnership around the FibreSeeker 3 while the Kickstarter is still live. Happy to hop on a quick call whenever works.\n\nMichael Flanigan\nModology Studios\nmichael@modologystudios.com",
  },
  {
    date: "2026-05-07",
    to: "ruanyuan@shining3d.com",
    subject: "Re: Creator Partnership Inquiry — Modology Studios × EinScan Rocket",
    text: "Hi Ms. Yuan,\n\nFollowing up on my email from a couple weeks ago about a creator partnership around the EinScan Rocket. Happy to discuss whether there's a media or creator program I could apply to.\n\nThanks,\nMichael Flanigan\nModology Studios\nmichael@modologystudios.com",
  },
];

const DEEPSEEK_SYSTEM = `You are the ClawHQ agent router. When given a task, you route it to the best agent and simulate execution.

Respond ONLY with valid JSON in this exact shape:
{
  "agent": "<agent name from: Felix, Researcher, ContentBot, CostOptimizer>",
  "agent_role": "<one short phrase describing the agent's role>",
  "model": "<one of: deepseek-chat, claude-sonnet-4-6, llama-3.3-70b>",
  "steps": ["<step 1>", "<step 2>", "<step 3>"],
  "result": "<2-3 sentence summary of what was done and the outcome. Be specific and realistic.>",
  "tokens_used": <integer between 800 and 4000>,
  "cost_usd": <float, e.g. 0.003>,
  "duration_ms": <integer between 800 and 4500>
}

Rules:
- Felix handles sales, email, outreach, CRM tasks
- Researcher handles research, competitor intel, market analysis, web scraping
- ContentBot handles writing, newsletters, social posts, content
- CostOptimizer handles anything about cost, billing, model selection, token optimization
- steps: exactly 3 steps, each under 12 words, describing what the agent actually did
- result: concrete, specific — mention real outputs, numbers, or actions taken
- Keep the whole response under 300 tokens`;

const SUPPORT_SYSTEM = `You are the ClawHQ support agent. ClawHQ is a self-hosted B2B AI agent control plane — teams use it to deploy, manage, and orchestrate AI agents on their own infrastructure.

Core components: OpenClaw (AI gateway, model routing), Hermes (task router), OpenFang (agent runtime), Paperclip (dashboard), ClawMart (skill marketplace). Deployment: Docker Compose self-hosted. Docs: https://clawhqplatform.com/docs

Reply professionally in under 200 words. For issues you cannot resolve, say you will escalate to the engineering team who will respond within one business day. Sign off as "— ClawHQ Support".`;

async function readStream(stream, maxBytes = 32768) {
  const chunks = [];
  let total = 0;
  const reader = stream.getReader();
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      const slice = value.slice(0, maxBytes - total);
      chunks.push(slice);
      total += slice.length;
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(merged);
}

function extractEmailBody(raw) {
  const ctMatch = raw.match(/Content-Type:\s*multipart\/[^;\r\n]+;\s*boundary="?([^"\r\n]+)"?/i);
  if (ctMatch) {
    const boundary = ctMatch[1].trim();
    for (const part of raw.split('--' + boundary)) {
      if (/Content-Type:\s*text\/plain/i.test(part)) {
        const idx = part.indexOf('\r\n\r\n');
        if (idx !== -1) return part.slice(idx + 4).replace(/\r\n/g, '\n').trim();
      }
    }
  }
  const idx = raw.indexOf('\r\n\r\n');
  return (idx !== -1 ? raw.slice(idx + 4) : raw).replace(/\r\n/g, '\n').trim();
}

export class EmailThread {
  constructor(state) {
    this.storage = state.storage;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/history') {
      return Response.json(await this.storage.get('history') ?? []);
    }
    if (request.method === 'POST' && url.pathname === '/add') {
      const exchange = await request.json();
      const history = await this.storage.get('history') ?? [];
      history.push(exchange);
      if (history.length > 8) history.splice(0, history.length - 8);
      await this.storage.put('history', history);
      return Response.json({ ok: true });
    }
    return new Response('not found', { status: 404 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // tryclawhq.com root → /demo
    if (url.hostname === "tryclawhq.com" && url.pathname === "/") {
      return Response.redirect("https://tryclawhq.com/demo", 302);
    }

    // install.clawhqplatform.com → raw install.sh from GitHub
    if (url.hostname === "install.clawhqplatform.com") {
      return Response.redirect(
        "https://raw.githubusercontent.com/ModologyStudiosLLC/clawhq-platform/main/install.sh",
        302
      );
    }

    // ── Demo lead capture ───────────────────────────────────────────────────────
    if (url.pathname === "/capture-lead" && request.method === "POST") {
      try {
        const body  = await request.json();
        const email = (body.email || "").trim().toLowerCase();
        const source = (body.source || "demo").slice(0, 50);

        if (!email || !email.includes("@")) {
          return new Response(JSON.stringify({ error: "invalid email" }), {
            status: 400, headers: { "Content-Type": "application/json" },
          });
        }

        // Store in KV: key = "lead:{email}", value = JSON
        if (env.DEMO_LEADS) {
          const existing = await env.DEMO_LEADS.get(`lead:${email}`);
          if (!existing) {
            await env.DEMO_LEADS.put(`lead:${email}`, JSON.stringify({
              email,
              source,
              captured_at: new Date().toISOString(),
            }));

            // Also append to lead list for easy polling
            const listRaw = await env.DEMO_LEADS.get("leads:list") || "[]";
            const list    = JSON.parse(listRaw);
            list.push({ email, source, captured_at: new Date().toISOString() });
            await env.DEMO_LEADS.put("leads:list", JSON.stringify(list));

            if (env.RESEND_API_KEY) {
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  from: "ClawHQ Leads <michael@modologystudios.com>",
                  to: ["michael@modologystudios.com"],
                  subject: `New ClawHQ demo lead — ${email}`,
                  text: `Email: ${email}\nSource: ${source}\nCaptured: ${new Date().toISOString()}`,
                }),
              }).catch(() => {});
            }
          }
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: {
            "Content-Type":                "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: "bad request" }), {
          status: 400, headers: { "Content-Type": "application/json" },
        });
      }
    }

    // ── Setup service lead capture ────────────────────────────────────────────────
    if (url.pathname === "/capture-setup" && request.method === "POST") {
      const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
      try {
        const body       = await request.json();
        const email      = (body.email    || "").trim().toLowerCase();
        const name       = (body.name     || "").trim().slice(0, 100);
        const company    = (body.company  || "").trim().slice(0, 100);
        const stack      = (body.stack    || "").trim().slice(0, 500);
        const bottleneck = (body.bottleneck || "").trim().slice(0, 500);

        if (!email || !email.includes("@")) {
          return new Response(JSON.stringify({ error: "invalid email" }), { status: 400, headers: cors });
        }

        const lead = { email, name, company, stack, bottleneck, source: "get-setup", captured_at: new Date().toISOString() };

        if (env.DEMO_LEADS) {
          const key = `setup-lead:${email}`;
          const existing = await env.DEMO_LEADS.get(key);
          if (!existing) {
            await env.DEMO_LEADS.put(key, JSON.stringify(lead));
            // Append to setup leads list
            const listRaw = await env.DEMO_LEADS.get("setup-leads:list") || "[]";
            const list = JSON.parse(listRaw);
            list.push(lead);
            await env.DEMO_LEADS.put("setup-leads:list", JSON.stringify(list));
          }
        }

        // Email notification for new setup lead
        if (env.RESEND_API_KEY) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "ClawHQ Leads <michael@modologystudios.com>",
              to: ["michael@modologystudios.com"],
              subject: `New ClawHQ setup lead — ${name || email}`,
              text: `Name: ${name || "—"}\nEmail: ${email}\nCompany: ${company || "—"}\nStack: ${stack || "—"}\nBottleneck: ${bottleneck || "—"}`,
            }),
          }).catch(() => {});
        }

        // Discord notification via webhook if configured
        if (env.DISCORD_WEBHOOK) {
          const msg = {
            content: `**New setup lead** from \`/get-setup\`\n**Email:** ${email}\n**Company:** ${company || "(not set)"}\n**Stack:** ${stack || "(not set)"}\n**Bottleneck:** ${bottleneck || "(not set)"}`,
          };
          await fetch(env.DISCORD_WEBHOOK, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(msg),
          }).catch(() => {});
        }

        return new Response(JSON.stringify({ ok: true }), { headers: cors });
      } catch (e) {
        return new Response(JSON.stringify({ error: "bad request" }), { status: 400, headers: cors });
      }
    }

    if (url.pathname === "/capture-setup" && request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
    }

    // ── Demo request form → Attio CRM ─────────────────────────────────────────
    if (url.pathname === "/request-demo" && request.method === "POST") {
      const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
      try {
        const body    = await request.json();
        const name    = (body.name    || "").trim();
        const email   = (body.email   || "").trim().toLowerCase();
        const company = (body.company || "").trim();
        const usecase = (body.usecase || "").trim();

        if (!email || !email.includes("@")) {
          return new Response(JSON.stringify({ error: "valid email required" }), { status: 400, headers: cors });
        }

        const attioToken = env.ATTIO_API_KEY;
        if (!attioToken) {
          return new Response(JSON.stringify({ error: "ATTIO_API_KEY not configured" }), { status: 500, headers: cors });
        }

        // Upsert person in Attio
        const parts = name ? name.trim().split(/\s+/) : [];
        const personPayload = {
          data: {
            values: {
              email_addresses: [{ email_address: email }],
            }
          }
        };
        if (parts.length > 0) {
          personPayload.data.values.name = [{
            first_name: parts[0],
            last_name: parts.slice(1).join(" ") || parts[0],
            full_name: name,
          }];
        }
        if (usecase) {
          personPayload.data.values.job_title = [{ value: `ClawHQ Demo Request - ${usecase.slice(0, 80)}` }];
        }

        const personRes = await fetch("https://api.attio.com/v2/objects/people/records?matching_attribute=email_addresses", {
          method: "PUT",
          headers: { "Authorization": `Bearer ${attioToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(personPayload),
        });

        const person = await personRes.json();
        if (!personRes.ok) {
          return new Response(JSON.stringify({ error: "attio_person_failed", detail: person }), { status: 500, headers: cors });
        }
        const personId = person?.data?.id?.record_id;

        if (personId) {
          // Add note to person
          await fetch("https://api.attio.com/v2/notes", {
            method: "POST",
            headers: { "Authorization": `Bearer ${attioToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              data: {
                parent_object: "people",
                parent_record_id: personId,
                title: "ClawHQ Demo Request",
                content: `Name: ${name || "—"}\nEmail: ${email}\nCompany: ${company || "—"}\nUse case: ${usecase || "—"}\nSource: tryclawhq.com\nSubmitted: ${new Date().toISOString()}`,
              }
            }),
          });

          // Create a Deal linked to the person
          const dealName = company ? `${company} — ClawHQ Demo` : `${name || email} — ClawHQ Demo`;
          const dealBody = {
            data: {
              values: {
                name: [{ value: dealName }],
                stage: [{ status: "Lead" }],
                owner: [{ referenced_actor_type: "workspace-member", referenced_actor_id: "663a07ba-fae7-4c70-a264-8d36eed81a9b" }],
                associated_people: [{ target_object: "people", target_record_id: personId }],
              }
            }
          };
          if (company) {
            // Upsert company and link it
            const coRes = await fetch("https://api.attio.com/v2/objects/companies/records?matching_attribute=name", {
              method: "PUT",
              headers: { "Authorization": `Bearer ${attioToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({ data: { values: { name: [{ value: company }] } } }),
            });
            const coData = await coRes.json();
            const coId = coData?.data?.id?.record_id;
            if (coId) dealBody.data.values.associated_company = [{ target_object: "companies", target_record_id: coId }];
          }
          await fetch("https://api.attio.com/v2/objects/deals/records", {
            method: "POST",
            headers: { "Authorization": `Bearer ${attioToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(dealBody),
          });
        }

        return new Response(JSON.stringify({ ok: true }), { headers: cors });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
      }
    }

    if (url.pathname === "/request-demo" && request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
    }

    // ── Setup leads list (private polling endpoint) ────────────────────────────
    if (url.pathname === "/setup-leads" && request.method === "GET") {
      const auth = request.headers.get("Authorization") || "";
      if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) {
        return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      }
      const listRaw = env.DEMO_LEADS ? await env.DEMO_LEADS.get("setup-leads:list") || "[]" : "[]";
      return new Response(listRaw, { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    // ── Live task runner (DeepSeek-backed) ────────────────────────────────────────
    if (url.pathname === "/api/run-task" && request.method === "POST") {
      const corsHeaders = {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      };

      try {
        const body = await request.json();
        const task = (body.task || "").slice(0, 300).trim();
        if (!task) {
          return new Response(JSON.stringify({ error: "no task" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }

        const groqKey = env.GROQ_API_KEY;
        const dsKey   = env.DEEPSEEK_API_KEY;
        if (!groqKey && !dsKey) {
          return new Response(JSON.stringify({ error: "not configured" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }

        // Try Groq first (free), fall back to DeepSeek
        const providers = [];
        if (groqKey) providers.push({ url: "https://api.groq.com/openai/v1/chat/completions", key: groqKey, model: "llama-3.3-70b-versatile" });
        if (dsKey)   providers.push({ url: "https://api.deepseek.com/v1/chat/completions",    key: dsKey,   model: "deepseek-chat" });

        let parsed = null;
        for (const provider of providers) {
          const resp = await fetch(provider.url, {
            method: "POST",
            headers: { "Authorization": `Bearer ${provider.key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: provider.model,
              messages: [
                { role: "system", content: DEEPSEEK_SYSTEM },
                { role: "user",   content: task },
              ],
              max_tokens: 400,
              temperature: 0.4,
            }),
          });
          if (!resp.ok) continue;
          const data    = await resp.json();
          const raw     = data.choices?.[0]?.message?.content?.trim() || "";
          const cleaned = raw.replace(/```json|```/g, "").trim();
          try { parsed = JSON.parse(cleaned); break; } catch { continue; }
        }

        if (!parsed) {
          return new Response(JSON.stringify({ error: "all providers failed" }), {
            status: 502, headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        return new Response(JSON.stringify(parsed), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
          status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    // CORS preflight for /api/run-task
    if (url.pathname === "/api/run-task" && request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin":  "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // CORS preflight for /capture-lead
    if (url.pathname === "/capture-lead" && request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin":  "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // ── Lead list endpoint (auth-gated for internal polling) ───────────────────
    if (url.pathname === "/leads" && request.method === "GET") {
      const key = url.searchParams.get("key");
      if (key !== "clawhq_leads_k7m3p9") {
        return new Response("Forbidden", { status: 403 });
      }
      const listRaw = env.DEMO_LEADS ? await env.DEMO_LEADS.get("leads:list") || "[]" : "[]";
      return new Response(listRaw, {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Outbound email via MailChannels (auth-gated) ──────────────────────────
    if (url.pathname === "/api/send-email" && request.method === "POST") {
      const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
      try {
        const body = await request.json();
        const secret = (body.secret || "").trim();
        if (!env.EMAIL_SECRET || secret !== env.EMAIL_SECRET) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });
        }
        const to      = (body.to      || "").trim();
        const subject = (body.subject || "").trim();
        const text    = (body.text    || "").trim();
        const from    = (body.from    || "michael@modologystudios.com").trim();
        if (!to || !subject || !text) {
          return new Response(JSON.stringify({ error: "to, subject, and text are required" }), { status: 400, headers: cors });
        }
        const payload = {
          from: `${(body.from_name || "Michael Flanigan — Modology Studios")} <${from}>`,
          to: [to],
          reply_to: "michael@modologystudios.com",
          subject,
          text,
        };
        const rs = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const rsData = await rs.json();
        if (rs.ok) {
          return new Response(JSON.stringify({ ok: true, to, id: rsData.id }), { headers: cors });
        }
        return new Response(JSON.stringify({ error: "resend_failed", detail: rsData }), { status: 502, headers: cors });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
      }
    }

    if (url.pathname === "/api/send-email" && request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
    }

    // ── Modology contact form ─────────────────────────────────────────────────
    if (url.pathname === "/api/contact" && request.method === "POST") {
      const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
      try {
        const body    = await request.json();
        const name    = (body.name    || "").trim().slice(0, 100);
        const email   = (body.email   || "").trim().toLowerCase();
        const message = (body.message || "").trim().slice(0, 2000);
        if (!email || !email.includes("@") || !message) {
          return new Response(JSON.stringify({ error: "email and message required" }), { status: 400, headers: cors });
        }
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Modology Studios Contact <michael@modologystudios.com>",
            to: ["michael@modologystudios.com"],
            reply_to: email,
            subject: `Contact form — ${name || email}`,
            text: `Name: ${name || "—"}\nEmail: ${email}\n\n${message}`,
          }),
        });
        return new Response(JSON.stringify({ ok: true }), { headers: cors });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
      }
    }

    if (url.pathname === "/api/contact" && request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
    }

    // Redirect bare /guides/* paths to /docs/guides/* (Mintlify handles /docs/*)
    if (url.pathname.startsWith("/guides/")) {
      const dest = new URL(request.url);
      dest.pathname = "/docs" + url.pathname;
      return Response.redirect(dest.toString(), 301);
    }

    // Serve extension-less paths as .html (e.g. /packs → /packs.html)
    if (!url.pathname.includes(".") && url.pathname !== "/") {
      const htmlUrl = new URL(request.url);
      htmlUrl.pathname = url.pathname + ".html";
      const htmlResponse = await env.ASSETS.fetch(new Request(htmlUrl.toString(), request));
      if (htmlResponse.status === 200) return htmlResponse;
    }

    // Fall through to static assets (index.html, packs.html, etc.)
    return env.ASSETS.fetch(request);
  },

  async scheduled(event, env) {
    const today = new Date().toISOString().slice(0, 10);
    const due = FOLLOW_UPS.filter(f => f.date === today);
    for (const f of due) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Michael Flanigan — Modology Studios <michael@modologystudios.com>",
          to: [f.to],
          reply_to: "michael@modologystudios.com",
          subject: f.subject,
          text: f.text,
        }),
      });
    }
  },

  async email(message, env, ctx) {
    const from = message.from;
    const subject = message.headers.get('subject') ?? '(no subject)';

    // Drop emails that originate from our own support address to prevent loops
    if (from.toLowerCase() === 'agent@clawhqplatform.com') {
      message.setReject('loop prevention');
      return;
    }

    let body = '';
    try {
      const raw = await readStream(message.raw);
      body = extractEmailBody(raw).slice(0, 2000);
    } catch { body = '(body unavailable)'; }

    // Load thread history from Durable Object keyed by sender
    let history = [];
    try {
      const stub = env.EMAIL_THREADS.get(env.EMAIL_THREADS.idFromName(from.toLowerCase()));
      history = await (await stub.fetch('http://do/history')).json();
    } catch {}

    const messages = [{ role: 'system', content: SUPPORT_SYSTEM }];
    for (const ex of history.slice(-4)) {
      messages.push({ role: 'user', content: `Subject: ${ex.subject}\n\n${ex.body}` });
      messages.push({ role: 'assistant', content: ex.reply });
    }
    messages.push({ role: 'user', content: `Subject: ${subject}\n\n${body}` });

    let reply = '';
    const providers = [];
    if (env.GROQ_API_KEY) providers.push({ url: 'https://api.groq.com/openai/v1/chat/completions', key: env.GROQ_API_KEY, model: 'llama-3.3-70b-versatile' });
    if (env.DEEPSEEK_API_KEY) providers.push({ url: 'https://api.deepseek.com/v1/chat/completions', key: env.DEEPSEEK_API_KEY, model: 'deepseek-chat' });

    for (const p of providers) {
      try {
        const res = await fetch(p.url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${p.key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: p.model, messages, max_tokens: 600, temperature: 0.3 }),
        });
        if (!res.ok) continue;
        reply = (await res.json()).choices?.[0]?.message?.content?.trim() ?? '';
        if (reply) break;
      } catch {}
    }

    if (!reply) reply = "Thanks for reaching out to ClawHQ. We've received your message and will respond within one business day.\n\n— ClawHQ Support";

    if (env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'ClawHQ Support <michael@modologystudios.com>',
          to: [from],
          reply_to: 'agent@clawhqplatform.com',
          subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
          text: reply,
        }),
      }).catch(() => {});
    }

    // Save exchange to Durable Object for thread continuity
    try {
      const stub = env.EMAIL_THREADS.get(env.EMAIL_THREADS.idFromName(from.toLowerCase()));
      await stub.fetch(new Request('http://do/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, subject, body, reply, at: new Date().toISOString() }),
      }));
    } catch {}

    if (env.DISCORD_WEBHOOK) {
      await fetch(env.DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `**Support email** from \`${from}\`\n**Subject:** ${subject}\n**Preview:** ${body.slice(0, 200)}\n**AI reply sent.**`,
        }),
      }).catch(() => {});
    }
  },
};
