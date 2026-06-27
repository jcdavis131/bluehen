/**
 * Built-in HTTP channel.
 *
 * Every eve app ships this channel. It exposes the stable session API:
 *   POST /eve/v1/session                    -> start a durable session
 *   GET  /eve/v1/session/:id/stream         -> NDJSON lifecycle stream
 *   POST /eve/v1/session/:id                 -> follow-up with continuationToken
 *
 * Add platform channels (Slack for Operator approvals, etc.) with:
 *   eve channels add slack
 */
export { default } from "eve/channels/http";
