// pages/api/glitchtip-tunnel.js
export default async function handler(req, res) {
  const url = `${process.env.GLITCHTIP_URL || 'https://errors.raydoug.com'}/api/2/envelope/?sentry_version=7&sentry_key=719f40c140114679b5d0cef6ab99ee5d&sentry_client=sentry.javascript.nextjs%2F9.2.0`;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        Accept: "*/*",
      },
      body: req.body,
    });

    return res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("GlitchTip tunnel error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
}
