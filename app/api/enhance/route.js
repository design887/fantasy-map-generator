export const maxDuration = 60;

export async function POST(req) {
  try {
    const { image, style, strength } = await req.json();
    if (!image) return Response.json({ error: "No image provided" }, { status: 400 });

    const apiToken = req.headers.get("x-replicate-token");
    if (!apiToken) return Response.json({ error: "No API token provided" }, { status: 401 });

    const stylePrompts = {
      fantasy: "highly detailed medieval fantasy map, hand-drawn cartography style, parchment texture, ornate compass rose, mountain illustrations, forest icons, old world cartography, detailed coastlines, ink drawn, Tolkien-style map illustration, masterpiece, best quality",
      parchment: "ancient hand-drawn map on aged parchment paper, sepia toned, ink illustrations, medieval cartography, weathered paper texture, calligraphy labels, vintage map style, antique atlas illustration, masterpiece, best quality",
      satellite: "3D raised relief map, shaded relief cartography, dramatic hillshade, hypsometric tinting, green lowlands to brown highlands to white peaks, embossed terrain, topographic map, NASA earth observation, masterpiece, best quality",
      watercolor: "beautiful watercolor painted fantasy map, soft washes of color, artistic cartography, hand-painted terrain, loose brushstrokes, artistic map illustration, painted coastlines, watercolor landscape map, masterpiece, best quality",
      tolkien: "detailed Tolkien-style fantasy map, Lord of the Rings cartography style, hand-drawn mountains and forests, elegant calligraphy, ink on parchment, Middle-earth map style, Christopher Tolkien illustration style, masterpiece, best quality",
      scifi: "futuristic sci-fi planetary survey map, holographic terrain display, neon grid overlay, cyberpunk cartography, digital topographic scan, alien world survey, advanced civilization mapping, masterpiece, best quality",
    };

    const fullPrompt = stylePrompts[style] || stylePrompts.fantasy;
    const negativePrompt = "blurry, low quality, text, watermark, logo, signature, jpeg artifacts, deformed, ugly, human figures, people, buildings, modern elements, UI elements, buttons, screenshot";

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        "Prefer": "wait=120",
      },
      body: JSON.stringify({
        version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        input: {
          image: image,
          prompt: fullPrompt,
          negative_prompt: negativePrompt,
          prompt_strength: strength || 0.65,
          num_inference_steps: 25,
          guidance_scale: 7.5,
          width: 1024,
          height: 680,
          scheduler: "K_EULER_ANCESTRAL",
        },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Replicate API error: ${response.status}`);
    }

    const prediction = await response.json();
    if (prediction.status === "succeeded") {
      const output = prediction.output;
      return Response.json({ status: "succeeded", output: Array.isArray(output) ? output[output.length - 1] : output });
    } else if (prediction.status === "failed") {
      throw new Error(prediction.error || "Generation failed on Replicate");
    } else {
      return Response.json({ status: prediction.status, id: prediction.id });
    }
  } catch (err) {
    console.error("Replicate API error:", err);
    return Response.json({ error: err.message || "Failed to generate" }, { status: 500 });
  }
}
