import { handleJudge } from "../lib/xai.mjs";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "POST only" });
    return;
  }
  const key =
    (typeof req.headers["x-api-key"] === "string" && req.headers["x-api-key"].trim()) ||
    process.env.XAI_API_KEY ||
    "";
  const result = await handleJudge(req.body || {}, key);
  res.status(200).json(result);
}
