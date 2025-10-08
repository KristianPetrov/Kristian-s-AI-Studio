"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type Size = "256x256" | "512x512" | "1024x1024" | "2048x2048";
type Action = "generate" | "edit" | "variation";

type GalleryItem = {
  id: string;
  createdAt: string;
  prompt: string;
  action: Action;
  size: Size;
  model: string;
  b64: string;
  tags?: string[];
};

const PROMPT_PRESETS: string[] = [
  "A neon-lit cyberpunk alley, rain-soaked, cinematic lighting, ultra-detailed",
  "Surreal floating islands above a pastel ocean, Studio Ghibli style",
  "Art deco poster of a futuristic city skyline at dusk",
  "Minimalist isometric room with plants and warm sunlight",
  "Astronaut discovering bioluminescent forest on an alien planet",
  "High-contrast black and white portrait, dramatic rim light, 35mm film",
];

function generateId() {
  if (typeof crypto !== "undefined" && (crypto as any)?.randomUUID) {
    return (crypto as any).randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function StudioClient() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<Size>("1024x1024");
  const [action, setAction] = useState<Action>("generate");
  const [model, setModel] = useState("gpt-image-1");
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [overlayOnExport, setOverlayOnExport] = useState(false);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const maskInputRef = useRef<HTMLInputElement | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  const canUpload = useMemo(() => action !== "generate", [action]);

  function loadGalleryFromStorage(): GalleryItem[] {
    try {
      const raw = localStorage.getItem("studio-gallery");
      if (!raw) return [];
      const parsed = JSON.parse(raw) as GalleryItem[];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((it) => ({ ...it, tags: Array.isArray((it as any).tags) ? (it as any).tags : [] }));
    } catch {
      return [];
    }
  }

  function saveGalleryToStorage(items: GalleryItem[]) {
    try {
      localStorage.setItem("studio-gallery", JSON.stringify(items));
    } catch {
      // ignore quota or serialization errors
    }
  }

  function addToGallery(item: GalleryItem) {
    setGallery((prev) => {
      const next = [item, ...prev].slice(0, 100);
      saveGalleryToStorage(next);
      return next;
    });
  }

  function deleteFromGallery(id: string) {
    setGallery((prev) => {
      const next = prev.filter((g) => g.id !== id);
      saveGalleryToStorage(next);
      return next;
    });
  }

  function handleUsePrompt(item: GalleryItem) {
    setPrompt(item.prompt);
    setAction(item.action);
    setSize(item.size);
    setModel(item.model);
    setTagsInput((item.tags || []).join(", "));
  }

  useEffect(() => {
    setGallery(loadGalleryFromStorage());
  }, []);

  function parseTags(input: string): string[] {
    return input
      .split(/[\,\n]/g)
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 20);
  }

  const filteredGallery = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return gallery;
    return gallery.filter((item) => {
      const txt = `${item.prompt} ${item.model} ${item.action} ${item.size}`.toLowerCase();
      const tagStr = (item.tags || []).join(" ").toLowerCase();
      return txt.includes(q) || tagStr.includes(q);
    });
  }, [gallery, searchQuery]);

  async function exportGalleryAsJSON() {
    try {
      const data = JSON.stringify(gallery, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `studio-gallery-${new Date().toISOString().slice(0, 19)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {}
  }

  function handleImportClick() {
    importFileRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error("Invalid JSON");
      const incoming: GalleryItem[] = arr
        .map((x) => ({
          id: String(x.id || generateId()),
          createdAt: String(x.createdAt || new Date().toISOString()),
          prompt: String(x.prompt || ""),
          action: (x.action as Action) || "generate",
          size: (x.size as Size) || "1024x1024",
          model: String(x.model || "gpt-image-1"),
          b64: String(x.b64 || ""),
          tags: Array.isArray(x.tags) ? (x.tags as string[]).map(String) : [],
        }))
        .filter((x) => x.b64.length > 0);

      setGallery((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const merged = [...incoming.filter((i) => !existingIds.has(i.id)), ...prev];
        saveGalleryToStorage(merged);
        return merged;
      });
    } catch (err) {
      setError((err as any)?.message || "Failed to import");
    } finally {
      e.target.value = "";
    }
  }

  type ExportFormat = "image/png" | "image/jpeg" | "image/webp";

  function loadImageFromB64(b64: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = `data:image/png;base64,${b64}`;
    });
  }

  function drawOverlay(ctx: CanvasRenderingContext2D, item: GalleryItem, width: number, height: number) {
    const pad = Math.max(16, Math.floor(width * 0.02));
    const overlayHeight = Math.max(72, Math.floor(height * 0.16));
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, height - overlayHeight, width, overlayHeight);

    ctx.fillStyle = "#fff";
    const headingSize = Math.max(16, Math.floor(width * 0.018));
    const metaSize = Math.max(12, Math.floor(width * 0.014));
    ctx.font = `600 ${headingSize}px system-ui, -apple-system, Segoe UI, Roboto`;
    const promptText = item.prompt;
    const maxPromptWidth = width - pad * 2;

    const words = promptText.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width < maxPromptWidth) {
        line = test;
      } else {
        if (line) lines.push(line);
        line = w;
      }
      if (lines.length === 2) break;
    }
    if (line && lines.length < 2) lines.push(line);
    const promptYStart = height - overlayHeight + pad + headingSize;
    lines.forEach((l, i) => {
      ctx.fillText(l, pad, promptYStart + i * (headingSize + 4));
    });

    ctx.font = `400 ${metaSize}px system-ui, -apple-system, Segoe UI, Roboto`;
    const meta = `${item.action} • ${item.size} • ${item.model} • ${(item.tags || []).join(", ")}`;
    ctx.fillText(meta, pad, height - pad);
  }

  async function buildExportDataUrl(item: GalleryItem, format: ExportFormat): Promise<string> {
    const img = await loadImageFromB64(item.b64);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(img, 0, 0);
    if (overlayOnExport) {
      drawOverlay(ctx, item, canvas.width, canvas.height);
    }
    const quality = format === "image/jpeg" ? 0.92 : 0.98;
    return canvas.toDataURL(format, quality as any);
  }

  async function handleExport(item: GalleryItem, format: ExportFormat) {
    try {
      const url = await buildExportDataUrl(item, format);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "image/png" ? "png" : format === "image/jpeg" ? "jpg" : "webp";
      a.download = `art-${item.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError((err as any)?.message || "Export failed");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setImageB64(null);
    try {
      let res: Response;
      if (canUpload) {
        const form = new FormData();
        form.set("action", action);
        form.set("prompt", prompt);
        form.set("size", size);
        form.set("model", model);
        const imageFile = imageInputRef.current?.files?.[0];
        if (imageFile) form.set("image", imageFile);
        const maskFile = maskInputRef.current?.files?.[0];
        if (maskFile) form.set("mask", maskFile);
        res = await fetch("/api/images", { method: "POST", body: form });
      } else {
        res = await fetch("/api/images", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt, size, model, action }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setImageB64(data.b64);
      addToGallery({
        id: generateId(),
        createdAt: new Date().toISOString(),
        prompt,
        action,
        size,
        model,
        b64: data.b64,
        tags: parseTags(tagsInput),
      });
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-8 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Digital Art Studio</h1>
      <div className="grid gap-2 max-w-2xl">
        <span className="text-sm">Prompt presets</span>
        <div className="flex flex-wrap gap-2">
          {PROMPT_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              className="text-xs rounded-full border border-black/10 dark:border-white/15 px-3 py-1 hover:bg-black/5 dark:hover:bg-white/10"
              onClick={() => setPrompt(p)}
              title={p}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-4 max-w-2xl">
        <label className="grid gap-2">
          <span className="text-sm">Prompt</span>
          <textarea
            className="rounded-md border border-black/10 dark:border-white/15 p-3 bg-transparent"
            placeholder="Describe your image..."
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm">Tags (comma-separated)</span>
          <input
            className="rounded-md border border-black/10 dark:border-white/15 p-2 bg-transparent"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="portrait, noir, high contrast"
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="grid gap-1">
            <span className="text-sm">Action</span>
            <select
              className="rounded-md border border-black/10 dark:border-white/15 p-2 bg-transparent"
              value={action}
              onChange={(e) => setAction(e.target.value as Action)}
            >
              <option value="generate">Generate</option>
              <option value="edit">Edit</option>
              <option value="variation">Variation</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Size</span>
            <select
              className="rounded-md border border-black/10 dark:border-white/15 p-2 bg-transparent"
              value={size}
              onChange={(e) => setSize(e.target.value as Size)}
            >
              <option value="256x256">256x256</option>
              <option value="512x512">512x512</option>
              <option value="1024x1024">1024x1024</option>
              <option value="2048x2048">2048x2048</option>
            </select>
          </label>
        </div>
        <label className="grid gap-1">
          <span className="text-sm">Model (optional)</span>
          <input
            className="rounded-md border border-black/10 dark:border-white/15 p-2 bg-transparent"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-image-1"
          />
        </label>
        {canUpload && (
          <div className="grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm">Image</span>
              <input ref={imageInputRef} type="file" accept="image/*" />
            </label>
            {action === "edit" && (
              <label className="grid gap-1">
                <span className="text-sm">Mask (transparent areas will be edited)</span>
                <input ref={maskInputRef} type="file" accept="image/*" />
              </label>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-foreground text-background px-4 py-2 disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create"}
        </button>
      </form>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      {imageB64 && (
        <div className="mt-4">
          <div className="relative w-full max-w-2xl aspect-square rounded-md border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/5">
            <Image
              alt="Generated"
              src={`data:image/png;base64,${imageB64}`}
              fill
              sizes="(min-width: 1024px) 768px, 100vw"
              className="object-contain rounded-md"
              priority
            />
          </div>
          <div className="flex gap-3 items-center mt-2">
            <a
              download="art.png"
              href={`data:image/png;base64,${imageB64}`}
              className="underline"
            >
              Download PNG
            </a>
            <span className="opacity-70 text-sm">(Gallery exports support JPEG/WebP and overlays)</span>
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">Gallery</h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={overlayOnExport} onChange={(e) => setOverlayOnExport(e.target.checked)} />
              Overlay metadata on export
            </label>
            <button type="button" className="text-sm underline" onClick={exportGalleryAsJSON}>Export JSON</button>
            <button type="button" className="text-sm underline" onClick={handleImportClick}>Import JSON</button>
            {gallery.length > 0 ? (
              <button
                type="button"
                className="text-sm underline"
                onClick={() => {
                  setGallery([]);
                  saveGalleryToStorage([]);
                }}
              >
                Clear all
              </button>
            ) : null}
          </div>
        </div>
        <div className="mb-4 max-w-2xl">
          <input
            className="w-full rounded-md border border-black/10 dark:border-white/15 p-2 bg-transparent"
            placeholder="Search prompts or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {gallery.length === 0 ? (
          <div className="text-sm opacity-70">No saved images yet. Create something to see it here.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGallery.map((item) => (
              <div key={item.id} className="rounded-md border border-black/10 dark:border-white/15 p-3 grid gap-2">
                <div className="relative w-full aspect-square">
                  <Image
                    alt={item.prompt}
                    src={`data:image/png;base64,${item.b64}`}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover rounded"
                  />
                </div>
                <div className="text-xs opacity-80 line-clamp-2" title={item.prompt}>{item.prompt}</div>
                <div className="flex flex-wrap gap-2 text-xs opacity-70">
                  <span>{item.action}</span>
                  <span>•</span>
                  <span>{item.size}</span>
                  <span>•</span>
                  <span>{item.model}</span>
                </div>
                {(item.tags && item.tags.length > 0) && (
                  <div className="flex flex-wrap gap-1 text-[10px] opacity-80">
                    {item.tags.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-full border border-black/10 dark:border-white/15">{t}</span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-black/10 dark:border-white/15 px-3 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                    onClick={() => handleUsePrompt(item)}
                  >
                    Use prompt
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-black/10 dark:border-white/15 px-3 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                      onClick={() => handleExport(item, "image/png")}
                    >
                      PNG
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-black/10 dark:border-white/15 px-3 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                      onClick={() => handleExport(item, "image/jpeg")}
                    >
                      JPEG
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-black/10 dark:border-white/15 px-3 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                      onClick={() => handleExport(item, "image/webp")}
                    >
                      WebP
                    </button>
                  </div>
                  <button
                    type="button"
                    className="rounded-md border border-black/10 dark:border-white/15 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={() => deleteFromGallery(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <input ref={importFileRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
    </div>
  );
}



