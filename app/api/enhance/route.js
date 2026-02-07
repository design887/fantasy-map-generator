export const maxDuration = 60;

export async function POST(req) {
  try {
    const { image, style, strength } = await req.json();
    if (!image) return Response.json({ error: "No image provided" }, { status: 400 });

    const apiToken = req.headers.get("x-replicate-token");
    if (!apiToken) return Response.json({ error: "No API token provided" }, { status: 401 });

    const stylePrompts = {
      fantasy: "fantasy map, highly detailed hand-drawn cartography, 2.5D illustrated terrain, ink and watercolor on parchment, ornate compass rose, illustrated mountains and forests seen from above, detailed coastlines with shading, ocean waves, by Brian Froud, fantasy concept painting, Magic The Gathering art style, trending on artstation, sharp focus, masterpiece, best quality",
      parchment: "fantasy map, ancient cartography on aged yellowed parchment paper, sepia and burnt umber ink, hand-drawn coastlines with crosshatching, medieval manuscript style, weathered paper texture with foxing and tea stains, antique atlas illustration, faded edges, old world exploration map, detailed terrain hatching, masterpiece, best quality",
      satellite: "fantasy map, 3D raised relief terrain visualization, dramatic hillshade lighting from northwest, hypsometric tinting with green lowlands through brown highlands to snow-white peaks, embossed topographic surface, NASA Blue Marble earth observation style, continental shelf gradient in ocean, photorealistic terrain, sharp focus, masterpiece, best quality",
      watercolor: "fantasy map, beautiful watercolor painting seen from above, soft color washes bleeding at edges, artistic cartography with loose expressive brushstrokes, hand-painted terrain in rich pigments, wet-on-wet technique, coastal areas with turquoise gradients, forest canopy in emerald greens, warm earth tones for highlands, artistic map illustration, masterpiece, best quality",
      tolkien: "fantasy map, by JRR Tolkien and Christopher Tolkien, Lord of the Rings cartography, fine pen and ink illustration on cream parchment, delicate hand-drawn mountain ranges in profile, stippled forests, flowing rivers with fine linework, elegant serif lettering style, Middle-earth map aesthetic, Vatican Map Room, classic book endpaper illustration, sharp focus, masterpiece, best quality",
      scifi: "fantasy map, futuristic planetary survey holographic display, topographic wireframe mesh overlay, neon cyan and magenta accent lines on dark background, digital terrain analysis scan, elevation contour data visualization, alien world geological survey, sci-fi HUD cartography interface, glowing terrain features, sharp focus, masterpiece, best quality",
    };

    const fullPrompt = stylePrompts[style] || stylePrompts.fantasy;
    const negativePrompt = "blurry, low quality, jpeg artifacts, deformed, ugly, human figures, people, buildings, modern elements, UI elements, buttons, screenshot, text, words, letters, writing, labels, numbers, alphabet, signature, watermark, logo, font, typography";

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
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
