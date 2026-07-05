import Link from "next/link";
import { PageHeader, RuledSection } from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";
import { CodeBlock } from "./CodeBlock";
import { RankPlayground } from "./RankPlayground";

export const metadata = {
  title: "Developers — Blue Hen RE",
  description:
    "API reference for the Relay Engine: contracts, corpus upload, recommendations, data exhaust, and automated certification.",
};

const BASE_URL = "https://api-production-3dea.up.railway.app";

const CONTRACT_REQUEST = `curl -X POST ${BASE_URL}/v1/contracts \\
  -H "Authorization: Bearer $SYNTH_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonSchema": {
      "properties": {
        "category": {"type": "string"},
        "price": {"type": "number"},
        "inStock": {"type": "boolean"}
      },
      "required": ["category"]
    },
    "filterable": [
      {"name": "category", "type": "keyword"},
      {"name": "price", "type": "number"}
    ]
  }'`;

const CONTRACT_RESPONSE = `{
  "version": 1,
  "filterable": [
    {"name": "category", "type": "keyword"},
    {"name": "price", "type": "number"}
  ]
}`;

const CORPUS_REQUEST = `curl -X POST ${BASE_URL}/v1/corpus \\
  -H "Authorization: Bearer $SYNTH_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "product-catalog",
    "documents": [
      {
        "id": "sku-1042",
        "title": "Trail Runner GTX",
        "text": "Waterproof trail running shoe built for wet, uneven terrain.",
        "metadata": {"category": "footwear", "price": 129.0, "inStock": true}
      },
      {
        "id": "sku-1043",
        "title": "Insulated Flask 750ml",
        "text": "Vacuum-insulated stainless flask, keeps drinks cold for 24 hours.",
        "metadata": {"category": "accessories", "price": 34.5, "inStock": true}
      }
    ],
    "train": true
  }'`;

const CORPUS_RESPONSE = `{
  "corpus": "product-catalog-8f2a1c3d.jsonl",
  "docCount": 2,
  "contractVersion": 1,
  "training": {
    "status": "queued",
    "collectionId": "8f2a1c3d-...-...",
    "jobId": "b91e7a2c-...-...",
    "siteId": null,
    "message": "Lifecycle queued — worker will train, eval, and record gates."
  }
}`;

const RECOMMEND_REQUEST = `curl -X POST ${BASE_URL}/v1/recommend \\
  -H "Authorization: Bearer $SYNTH_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "waterproof trail shoe for wet climates",
    "k": 5,
    "filters": {
      "category": "footwear",
      "price": {"gte": 20, "lte": 150}
    }
  }'`;

const RECOMMEND_RESPONSE = `{
  "modelVersion": "v7",
  "recommendations": [
    {
      "id": "sku-1042",
      "title": "Trail Runner GTX",
      "score": 0.8421,
      "reason": "Waterproof trail running shoe built for wet, uneven terrain.",
      "url": null,
      "metadata": {"category": "footwear", "price": 129.0, "inStock": true}
    }
  ]
}`;

const RECOMMEND_ITEM_NOTE = `# item-to-item instead of text-to-item — provide exactly one of "text" or "itemId"
{"itemId": "sku-1042", "k": 5}`;

const EXHAUST_REQUEST = `curl -X POST ${BASE_URL}/v1/exhaust \\
  -H "Authorization: Bearer $SYNTH_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": "storefront-widget",
    "kind": "interaction",
    "consent": true,
    "payload": {"event": "click", "itemId": "sku-1042", "position": 1}
  }'`;

const EXHAUST_RESPONSE_CONSENT = `{
  "stored": true,
  "receipt": "9c1c9c2e-4b7a-4d2b-9e1a-2b3c4d5e6f70"
}`;

const EXHAUST_RESPONSE_NO_CONSENT = `{
  "stored": false,
  "reason": "no consent — event counted, payload discarded"
}`;

const CERTIFY_REQUEST = `curl -X POST ${BASE_URL}/v1/certify \\
  -H "Authorization: Bearer $SYNTH_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "endpointUrl": "https://your-domain.example.com/embed"
  }'`;

const CERTIFY_RESPONSE = `{
  "submissionId": "c3b9e1f0-....-....-....-............",
  "status": "pending",
  "contract": "your endpoint: POST {\\"texts\\": [...]} -> {\\"vectors\\": [[...], ...]}",
  "paymentStatus": "pending-gate"
}`;

const CERTIFY_ENDPOINT_CONTRACT = `# what YOUR endpoint must implement — this is what we call:
POST https://your-domain.example.com/embed
{"texts": ["some text to embed", "another text"]}

# your endpoint must respond:
{"vectors": [[0.0123, -0.0041, ...], [0.0087, 0.0192, ...]]}
# one vector per text, same order, same length every time`;

const CERTIFY_POLL = `curl ${BASE_URL}/v1/certify/c3b9e1f0-....-....-....-............ \\
  -H "Authorization: Bearer $SYNTH_API_KEY"`;

const RATE_LIMITS: Array<{ bucket: string; endpoint: string; limit: string }> = [
  { bucket: "catalog", endpoint: "GET /v1/catalog/*", limit: "120 / min" },
  { bucket: "recommend", endpoint: "POST /v1/recommend", limit: "60 / min" },
  { bucket: "rank", endpoint: "POST /v1/rank", limit: "60 / min" },
  { bucket: "corpus", endpoint: "POST /v1/corpus", limit: "6 / min" },
  { bucket: "exhaust", endpoint: "POST /v1/exhaust", limit: "120 / min" },
  { bucket: "contracts", endpoint: "POST /v1/contracts", limit: "12 / min" },
];

const RANK_REQUEST = `curl -X POST ${BASE_URL}/v1/rank \\
  -H "Authorization: Bearer $SYNTH_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "items": [
      {"id": "sku-1042", "text": "Waterproof trail running shoe built for wet, uneven terrain.", "metadata": {"category": "footwear", "price": 129.0}},
      {"id": "sku-1043", "text": "Vacuum-insulated stainless flask, keeps drinks cold for 24 hours.", "metadata": {"category": "accessories", "price": 34.5}}
    ],
    "query": "gift for someone who hikes",
    "userRef": "8f14e45fceea167a5a36dedd4bea2543",
    "k": 5,
    "policy": {"wPersonal": 0.5, "wQuery": 0.4, "wBoosts": 0.1}
  }'`;

const RANK_RESPONSE = `{
  "ranked": [
    {
      "id": "sku-1042",
      "text": "Waterproof trail running shoe built for wet, uneven terrain.",
      "score": 0.7132,
      "factors": {
        "personal": 0.6820,
        "query": 0.7501,
        "boosts": null,
        "weights": {"personal": 0.5, "query": 0.4, "boosts": 0.1}
      }
    },
    {
      "id": "sku-1043",
      "text": "Vacuum-insulated stainless flask, keeps drinks cold for 24 hours.",
      "score": 0.4118,
      "factors": {
        "personal": 0.3312,
        "query": 0.4988,
        "boosts": null,
        "weights": {"personal": 0.5, "query": 0.4, "boosts": 0.1}
      }
    }
  ],
  "personalized": true,
  "candidateCount": 2,
  "policy": {"wPersonal": 0.5, "wQuery": 0.4, "wBoosts": 0.1, "boosts": []}
}`;

const RANK_EXHAUST_NOTE = `# power personalization by sending consented interactions first —
# userRef must be a one-way hash of your internal user id, never PII
curl -X POST ${BASE_URL}/v1/exhaust \\
  -H "Authorization: Bearer $SYNTH_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": "storefront-widget",
    "kind": "interaction",
    "consent": true,
    "payload": {
      "event": "click",
      "userRef": "8f14e45fceea167a5a36dedd4bea2543",
      "itemText": "Waterproof trail running shoe built for wet, uneven terrain."
    }
  }'`;

export default function DevelopersPage() {
  const surface = getSiteCircuit("storefront");

  return (
    <>
      <PageHeader
        eyebrow={`API · ${surface?.eyebrow ?? "Storefront"}`}
        title="Developers"
        lead="An API-first platform: register a metadata contract, upload a corpus, and call recommendations over the same production path every product surface uses. No dashboards required."
        badge={<span className="bh-badge bh-badge--accent">Bearer auth</span>}
      />

      <RuledSection label="Authentication">
        <p className="bh-card__body">
          Every request carries a workspace key as a bearer token:
        </p>
        <CodeBlock label="header" code={`Authorization: Bearer $SYNTH_API_KEY`} />
        <p className="bh-card__body" style={{ marginTop: 12 }}>
          Base URL: <code>{BASE_URL}</code>
        </p>
        <p className="bh-card__body">
          Keys are issued per workspace during onboarding — there is no
          self-serve key creation yet. <Link href="/contact?topic=api-access">Request one via a briefing</Link>,
          and we provision the workspace and hand you the key directly.
        </p>
      </RuledSection>

      <RuledSection label="Quickstart">
        <p className="bh-card__body">
          Three calls take you from a schema declaration to a served
          recommendation.
        </p>

        <div className="bh-card" style={{ marginTop: 16 }}>
          <div className="bh-card__title">1. Register a metadata contract</div>
          <p className="bh-card__body">
            Declare the fields on your documents and which of them are
            filterable at query time. Contracts are versioned and append-only —
            the newest version validates every subsequent write.
          </p>
          <CodeBlock label="POST /v1/contracts" code={CONTRACT_REQUEST} />
          <p className="bh-meta" style={{ marginTop: 8 }}>Response</p>
          <CodeBlock label="201 Created" code={CONTRACT_RESPONSE} />
        </div>

        <div className="bh-card" style={{ marginTop: 16 }}>
          <div className="bh-card__title">2. Upload a corpus</div>
          <p className="bh-card__body">
            Documents in, a gated recommender out. Metadata is validated
            against your active contract; training queues automatically
            unless <code>train</code> is set to <code>false</code>.
          </p>
          <CodeBlock label="POST /v1/corpus" code={CORPUS_REQUEST} />
          <p className="bh-meta" style={{ marginTop: 8 }}>Response</p>
          <CodeBlock label="201 Created" code={CORPUS_RESPONSE} />
        </div>

        <div className="bh-card" style={{ marginTop: 16 }}>
          <div className="bh-card__title">3. Recommend</div>
          <p className="bh-card__body">
            Text-to-item or item-to-item, with filters compiled against your
            contract's declared fields. <code>filters</code> accepts a bare
            value (equality) or an operator object — <code>eq</code>/
            <code>in</code> for keyword fields, <code>gte</code>/<code>lte</code>{" "}
            for a number range.
          </p>
          <CodeBlock label="POST /v1/recommend" code={RECOMMEND_REQUEST} />
          <p className="bh-meta" style={{ marginTop: 8 }}>Response</p>
          <CodeBlock label="200 OK" code={RECOMMEND_RESPONSE} />
          <p className="bh-meta" style={{ marginTop: 8 }}>Item-to-item variant</p>
          <CodeBlock label="body" code={RECOMMEND_ITEM_NOTE} />
        </div>
      </RuledSection>

      <RuledSection label="Data exhaust">
        <p className="bh-card__body">
          One intake schema for every consumer surface — clicks, submissions,
          queries, outcomes. Send it as it happens; the consent rule decides
          what survives.
        </p>
        <CodeBlock label="POST /v1/exhaust" code={EXHAUST_REQUEST} />
        <p className="bh-card__body" style={{ marginTop: 12, fontWeight: 600 }}>
          The consent rule, stated plainly: no consent means the event is
          counted and the payload is discarded. Nothing from an unconsented
          event is ever stored.
        </p>
        <p className="bh-meta">Response — consent: true</p>
        <CodeBlock label="201 Created" code={EXHAUST_RESPONSE_CONSENT} />
        <p className="bh-meta" style={{ marginTop: 8 }}>Response — consent: false (default)</p>
        <CodeBlock label="201 Created" code={EXHAUST_RESPONSE_NO_CONSENT} />
        <p className="bh-card__body" style={{ marginTop: 12 }}>
          <code>kind</code> must be one of <code>interaction</code>,{" "}
          <code>submission</code>, <code>query</code>, or <code>outcome</code>.
        </p>
      </RuledSection>

      <RuledSection label="Rank Engine">
        <p className="bh-card__body">
          <code>POST /v1/rank</code> ranks anything — inline items or your
          indexed corpus — against an optional query and an optional
          pseudonymous user, with every position explained by a
          factor breakdown. Personalization is honest by construction: if
          there's no history for a <code>userRef</code>, its weight
          redistributes to query and boosts rather than fabricating an
          affinity.
        </p>
        <CodeBlock label="POST /v1/rank" code={RANK_REQUEST} />
        <p className="bh-meta" style={{ marginTop: 8 }}>Response</p>
        <CodeBlock label="200 OK" code={RANK_RESPONSE} />
        <p className="bh-card__body" style={{ marginTop: 12 }}>
          Each ranked item carries a <code>factors</code> breakdown:{" "}
          <code>personal</code> (cosine similarity to the user's ephemeral
          vector, or <code>null</code> with no <code>userRef</code> history),{" "}
          <code>query</code> (cosine similarity to the query, or{" "}
          <code>null</code> with no query), <code>boosts</code> (per-field
          detail for any contract-declared numeric/date boosts, or{" "}
          <code>null</code>), and <code>weights</code> — the effective
          weights actually used after redistribution. The default policy is{" "}
          <code>{"{ wPersonal: 0.45, wQuery: 0.45, wBoosts: 0.10 }"}</code>;
          override any subset per request via <code>policy</code>. Inline{" "}
          <code>items</code> are capped at 200 per request, 32KB of text
          each.
        </p>
        <p className="bh-card__body" style={{ marginTop: 12 }}>
          Personalization is powered by the same <code>/v1/exhaust</code>{" "}
          intake as everything else: send consented interactions with a{" "}
          <code>userRef</code> (a one-way hashed pseudonym — never an email,
          name, or other PII) and an <code>itemText</code> field. The engine
          builds a decayed-mean vector over each user's recent consented
          interactions at rank time — nothing is stored beyond a 60-second
          cache.
        </p>
        <CodeBlock label="POST /v1/exhaust" code={RANK_EXHAUST_NOTE} />
        <p className="bh-card__body" style={{ marginTop: 12, fontWeight: 600 }}>
          Personalization uplift is unmeasured until real interaction data
          accumulates — the eval is specced (RANK-004) and will publish to
          the evidence ledger.
        </p>
        <RankPlayground />
      </RuledSection>

      <RuledSection label="Certification API">
        <p className="bh-card__body">
          Automated grading for your own embedding endpoint, run against the
          same metric code that grades our models — no human in the loop.
          Submit an endpoint; we call it, score it, and return a scorecard.
        </p>
        <p className="bh-meta">Your endpoint's contract</p>
        <CodeBlock label="what we call" code={CERTIFY_ENDPOINT_CONTRACT} />
        <p className="bh-meta" style={{ marginTop: 12 }}>Submit for certification</p>
        <CodeBlock label="POST /v1/certify" code={CERTIFY_REQUEST} />
        <p className="bh-meta" style={{ marginTop: 8 }}>Response</p>
        <CodeBlock label="201 Created" code={CERTIFY_RESPONSE} />
        <p className="bh-card__body" style={{ marginTop: 12 }}>
          Poll for the scorecard once grading completes:
        </p>
        <CodeBlock label="GET /v1/certify/:id" code={CERTIFY_POLL} />
      </RuledSection>

      <RuledSection label="Rate limits">
        <p className="bh-card__body">
          Fixed-window, per-IP, enforced per route bucket. A <code>429</code>{" "}
          carries a <code>Retry-After: 60</code> header.
        </p>
        <div className="bh-table-wrap">
          <table className="bh-table">
            <tbody>
              <tr>
                <th>Bucket</th>
                <th>Endpoint</th>
                <th>Limit</th>
              </tr>
              {RATE_LIMITS.map((r) => (
                <tr key={r.bucket}>
                  <td><code>{r.bucket}</code></td>
                  <td><code>{r.endpoint}</code></td>
                  <td>{r.limit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RuledSection>

      <RuledSection label="Payments">
        <p className="bh-card__body">
          Usage metering is live on every workspace today — the{" "}
          <code>/v1/usage</code> endpoint reflects real call counts per
          bucket. Invoicing launches with payment rails; until then, engagements
          are billed manually per the terms agreed in your briefing.
        </p>
      </RuledSection>
    </>
  );
}
