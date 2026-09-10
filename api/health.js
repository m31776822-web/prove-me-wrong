export default async function handler(_req, res) {
  res.status(200).json({ ok: true, hasServerKey: Boolean(process.env.XAI_API_KEY) });
}
