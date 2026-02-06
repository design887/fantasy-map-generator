export const maxDuration = 60;

export async function POST(req) {
  try {
    const { image, prompt, style, strength } = await req.json();

    if (!image) {
      return Response.json({ error: "No image provided" }, { status: 400 });
    }

    const apiToken = req.headers.get("x-replicate-token");
    if (!apiToken) {
      return Response.json({ error: "No API token provided" }, { status: 401 });
    }

    const stylePrompts = {
      fantasy: "highly detailed medieval fantasy map, hand-drawn cartography style, parchment texture, ornate compass rose, mountain illustrations, forest icons, old world cartography, detailed coastlines, ink drawn, Tolkien-style map illustration",
      parchment: "ancient hand-drawn map on aged parchment paper, sepia toned, ink illustrations, medieval cartography, weathered paper texture, calligraphy labels, vintage map style, antique atlas illustration",
      satellite: "photorealistic satellite view of fantasy continent, NASA-style earth observation, realistic terrain, ocean colors, cloud shadows, topographic detail, aerial photography, geographic survey",
      watercolor: "beautiful watercolor painted fantasy map, soft washes of color, artistic cartography, hand-painted terrain, loose brushstrokes, artistic map illustration, painted coastlines, watercolor landscape map",
      tolkien: "detailed Tolkien-style fantasy map, Lord of the Rings cartography style, hand-drawn mountains and forests, elegant calligraphy, ink on parchment, Middle-earth map style, Christopher Tolkien illustration style",
      scifi: "futuristic sci-fi planetary survey map, holographic terrain display, neon grid overlay, cyberpunk cartography, digital topographic scan, alien world survey, advanced civilization mapping",
    };

    const basePrompt = stylePrompts[style] || stylePrompts.fantasy;
    const fullPrompt = prompt ? `${basePrompt}, ${prompt}` : basePrompt;
    const negativePrompt = "blurry, low quality, text, watermark, logo, signature, jpeg artifacts, deformed, ugly, bad anatomy, human figures, people, buildings, modern elements, UI elements, buttons, screenshot";

    // Use predictions.create with explicit version hash for stability-ai/sdxl
    // This works universally (official + non-official models)
    const res = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        "Prefer": "wait",  // Blocking mode — waits up to 60s for result
      },
      body: JSON.stringify({
        version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        input: {
          image: image,
          prompt: fullPrompt,
          negative_prompt: negativePrompt,
          prompt_strength: strength || 0.65,
          num_inference_steps: 35,
          guidance_scale: 7.5,
          width: 1344,
          height: 896,
          scheduler: "K_EULER_ANCESTRAL",
          refine: "expert_ensemble_refiner",
          high_noise_frac: 0.8,
        },
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || errData.error || `Replicate API returned ${res.status}`);
    }

    const prediction = await res.json();

    if (prediction.status === "succeeded" && prediction.output) {
      const output = prediction.output;
      const imageUrl = Array.isArray(output) ? output[output.length - 1] : output;
      return Response.json({ status: "succeeded", output: imageUrl });
    } else if (prediction.status === "failed") {
      throw new Error(prediction.error || "Generation failed");
    } else {
      // Still processing — return prediction ID for polling
      return Response.json({ status: prediction.status, id: prediction.id });
    }
  } catch (err) {
    console.error("Replicate API error:", err);
    return Response.json(
      { error: err.message || "Failed to generate" },
      { status: 500 }
    );
  }
}
