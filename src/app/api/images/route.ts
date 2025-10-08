import { NextRequest } from "next/server";
import OpenAI from "openai";

// Using the latest image generation model available via the Images API.
// We keep the model name configurable via request payload with a safe default.

export const runtime = "edge";

type GenerateBody = {
    action?: "generate" | "edit" | "variation";
    prompt?: string;
    size?: "256x256" | "512x512" | "1024x1024" | "2048x2048";
    model?: string;
};

function getOpenAI ()
{
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not set");
    }
    return new OpenAI({ apiKey });
}

export async function POST (req: NextRequest)
{
    try {
        const contentType = req.headers.get("content-type") || "";

        const client = getOpenAI();

        // If multipart, we support image edit/variation with file(s).
        if (contentType.includes("multipart/form-data")) {
            const form = await req.formData();
            const action = (form.get("action") as string) || "generate";
            const prompt = (form.get("prompt") as string) || "";
            const size = ((form.get("size") as string) || "1024x1024") as GenerateBody["size"];
            const model = ((form.get("model") as string) || "gpt-image-1");

            if (action === "edit") {
                const image = form.get("image");
                if (!image || !(image instanceof File)) {
                    return new Response(JSON.stringify({ error: "image file is required for edit" }), { status: 400 });
                }
                const mask = form.get("mask");
                const imageFile = image as File;
                const maskFile = mask instanceof File ? mask : undefined;

                const params: any = {
                    model,
                    prompt,
                    image: [imageFile],
                    ...(maskFile ? { mask: maskFile } : {}),
                    size,
                };
                // Only DALL·E 2 supports response_format; gpt-image-1 always returns base64
                if (String(model).includes("dall-e")) {
                    params.response_format = "b64_json";
                }
                const res = await client.images.edit(params);

                const b64 = res.data?.[0]?.b64_json;
                if (!b64) return new Response(JSON.stringify({ error: "no image returned" }), { status: 500 });
                return new Response(JSON.stringify({ b64 }), { headers: { "content-type": "application/json" } });
            }

            if (action === "variation") {
                const image = form.get("image");
                if (!image || !(image instanceof File)) {
                    return new Response(JSON.stringify({ error: "image file is required for variation" }), { status: 400 });
                }
                const imageFile = image as File;
                const varModel = String(model).includes("dall-e") ? model : "dall-e-2";
                const res = await client.images.createVariation({
                    model: varModel,
                    image: imageFile,
                    size,
                    response_format: "b64_json",
                } as any);
                const b64 = res.data?.[0]?.b64_json;
                if (!b64) return new Response(JSON.stringify({ error: "no image returned" }), { status: 500 });
                return new Response(JSON.stringify({ b64 }), { headers: { "content-type": "application/json" } });
            }

            // default: generate using prompt (even for multipart request)
            const genParams: any = { model, prompt, size };
            if (String(model).includes("dall-e")) {
                genParams.response_format = "b64_json";
            }
            const res = await client.images.generate(genParams);
            const b64 = res.data?.[0]?.b64_json;
            if (!b64) return new Response(JSON.stringify({ error: "no image returned" }), { status: 500 });
            return new Response(JSON.stringify({ b64 }), { headers: { "content-type": "application/json" } });
        }

        // JSON body for simple generation
        const body = (await req.json()) as GenerateBody;
        const prompt = body.prompt || "";
        const size = body.size || "1024x1024";
        const model = body.model || "gpt-image-1";

        const genParams2: any = { model, prompt, size };
        if (String(model).includes("dall-e")) {
            genParams2.response_format = "b64_json";
        }
        const res = await client.images.generate(genParams2);
        const b64 = res.data?.[0]?.b64_json;
        if (!b64) return new Response(JSON.stringify({ error: "no image returned" }), { status: 500 });
        return new Response(JSON.stringify({ b64 }), { headers: { "content-type": "application/json" } });
    } catch (err: any) {
        const message = err?.message || "Unknown error";
        return new Response(JSON.stringify({ error: message }), { status: 500 });
    }
}


