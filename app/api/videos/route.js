/**
 * to-streamable - Upload video quickly to Streamable.com
 * @author Zach Bruggeman <mail@bruggie.com>
 * @package to-streamable
 */

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { shortcode, username, password } = await request.json();
    if (!shortcode || !username || !password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    const apiUrl = `https://api.streamable.com/videos/${shortcode}`;
    const auth = Buffer.from(`${username}:${password}`).toString("base64");

    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    });

    const body = await res.json();

    if (!res.ok || body.status === 3) {
      return new Response(
        JSON.stringify({
          error: body?.message || "Video not found or failed",
        }),
        { status: 404 }
      );
    }

    return new Response(JSON.stringify(body), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}
