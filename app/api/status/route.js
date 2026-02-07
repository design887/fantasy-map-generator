export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const predictionId = searchParams.get("id");
    if (!predictionId) return Response.json({ error: "No prediction ID" }, { status: 400 });

    const apiToken = req.headers.get("x-replicate-token");
    if (!apiToken) return Response.json({ error: "No API token provided" }, { status: 401 });

    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { "Authorization": `Bearer ${apiToken}` },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Status check failed: ${res.status}`);
    }

    const prediction = await res.json();
    if (prediction.status === "succeeded") {
      const output = prediction.output;
      return Response.json({ status: "succeeded", output: Array.isArray(output) ? output[output.length - 1] : output });
    } else if (prediction.status === "failed") {
      return Response.json({ status: "failed", error: prediction.error || "Generation failed" });
    } else {
      return Response.json({ status: prediction.status, id: prediction.id });
    }
  } catch (err) {
    console.error("Status check error:", err);
    return Response.json({ error: err.message || "Failed to check status" }, { status: 500 });
  }
}
