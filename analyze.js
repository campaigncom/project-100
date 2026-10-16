// Project 100 - AI analysis endpoint (Vercel serverless function)
// Place this file at: api/analyze.js
// Set the environment variable ANTHROPIC_API_KEY in your Vercel project settings.
// The API key stays on the server and is never sent to the browser.

const MODEL = "claude-sonnet-5-5";
const MAX_CHARS = 8000;

const PROMPTS = {
  mood: `ನೀವು ರಾಜಕೀಯ ಸಾರ್ವಜನಿಕ ಅಭಿಪ್ರಾಯ ವಿಶ್ಲೇಷಕರು. ಬಳಕೆದಾರರ ಪಠ್ಯವನ್ನು ವಿಶ್ಲೇಷಿಸಿ.
ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ. ಈ ಕ್ರಮದಲ್ಲಿ ಸಂಕ್ಷಿಪ್ತವಾಗಿ ಬರೆಯಿರಿ:
1. ಒಟ್ಟಾರೆ ಭಾವನೆ (ಸಕಾರಾತ್ಮಕ / ನಕಾರಾತ್ಮಕ / ಮಿಶ್ರ / ತಟಸ್ಥ) ಮತ್ತು ಕಾರಣ
2. ಮುಖ್ಯ ವಿಷಯಗಳು (ಉದ್ಯೋಗ, ರಸ್ತೆ, ಶಿಕ್ಷಣ ಇತ್ಯಾದಿ)
3. ಜನರ ಮುಖ್ಯ ಬೇಡಿಕೆ ಅಥವಾ ದೂರು
4. ವ್ಯಂಗ್ಯ ಅಥವಾ ಅಸ್ಪಷ್ಟತೆ ಇದ್ದರೆ ಟಿಪ್ಪಣಿ
ಪಠ್ಯದಲ್ಲಿ ಇಲ್ಲದ ಮಾಹಿತಿಯನ್ನು ಸೇರಿಸಬೇಡಿ. ನಿಮ್ಮದೇ ರಾಜಕೀಯ ಅಭಿಪ್ರಾಯ ನೀಡಬೇಡಿ.`,

  interview: `ನೀವು ಸಂದರ್ಶನ ವಿಶ್ಲೇಷಕರು. ಕೆಳಗಿನ ಸಂದರ್ಶನ ಪಠ್ಯವನ್ನು ಕನ್ನಡದಲ್ಲಿ ಸಾರಾಂಶಿಸಿ.
ಈ ಕ್ರಮದಲ್ಲಿ ಬರೆಯಿರಿ:
1. ಸಾರಾಂಶ (3-4 ವಾಕ್ಯ)
2. ಮುಖ್ಯ ಅಂಶಗಳು (ಪಟ್ಟಿ)
3. ವ್ಯಕ್ತವಾದ ಭಾವನೆ
4. ಪ್ರಸ್ತಾಪಿಸಿದ ಸಮಸ್ಯೆಗಳು ಮತ್ತು ಬೇಡಿಕೆಗಳು
ಪಠ್ಯದಲ್ಲಿ ಇಲ್ಲದ ಮಾಹಿತಿಯನ್ನು ಸೇರಿಸಬೇಡಿ.`
};

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST ಮಾತ್ರ ಅನುಮತಿಸಲಾಗಿದೆ" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY ಹೊಂದಿಸಿಲ್ಲ" });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  const mode = body.mode;
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!PROMPTS[mode]) {
    return res.status(400).json({ error: "ಅಮಾನ್ಯ mode" });
  }
  if (!text) {
    return res.status(400).json({ error: "ಪಠ್ಯ ಖಾಲಿ ಇದೆ" });
  }
  if (text.length > MAX_CHARS) {
    return res.status(400).json({ error: "ಪಠ್ಯ ತುಂಬಾ ಉದ್ದವಾಗಿದೆ (ಗರಿಷ್ಠ " + MAX_CHARS + " ಅಕ್ಷರ)" });
  }

  try {
    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        system: PROMPTS[mode],
        messages: [{ role: "user", content: text }]
      })
    });

    const data = await apiRes.json();
    if (!apiRes.ok) {
      return res.status(502).json({ error: (data.error && data.error.message) || "AI ಸೇವೆ ದೋಷ" });
    }

    const result = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n")
      .trim();

    return res.status(200).json({ result });
  } catch (err) {
    return res.status(500).json({ error: "ಸರ್ವರ್ ದೋಷ: " + err.message });
  }
};

function safeParse(s) {
  try { return JSON.parse(s); } catch (e) { return {}; }
}
