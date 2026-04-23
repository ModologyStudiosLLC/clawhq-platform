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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // tryclawhq.com root → /demo
    if (url.hostname === "tryclawhq.com" && url.pathname === "/") {
      return Response.redirect("https://tryclawhq.com/demo", 302);
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

        // Upsert person in Attio
        const personRes = await fetch("https://api.attio.com/v2/objects/people/records?matching_attribute=email_addresses", {
          method: "PUT",
          headers: { "Authorization": `Bearer ${attioToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            data: {
              values: {
                name: name ? [{ first_name: name.split(" ")[0], last_name: name.split(" ").slice(1).join(" ") || "" }] : undefined,
                email_addresses: [{ email_address: email }],
                job_title: usecase ? [`ClawHQ Demo Request — ${usecase.slice(0, 80)}`] : undefined,
              }
            }
          }),
        });

        const person = await personRes.json();
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
                stage: [{ status_id: "af706003-b27b-4f75-b35b-5ca71fa7633b" }], // Lead
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
};
