import { useEffect, useState } from "react";

/**
 * Returns a coarse GPU capability tier (0 = none/low, 3 = capable).
 *
 * Shim for the original @dheiver2/ui hook. Returns 0 when WebGL is
 * unavailable, the renderer is a software rasterizer (SwiftShader/llvmpipe),
 * or the user prefers reduced motion — so callers can skip expensive
 * animated layers in those cases.
 */
export function useGpuTier(): number {
  const [tier, setTier] = useState(0);

  useEffect(() => {
    try {
      if (
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        setTier(0);
        return;
      }
      const canvas = document.createElement("canvas");
      const gl =
        (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
        (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
      if (!gl) {
        setTier(0);
        return;
      }
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      const renderer = dbg
        ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "")
        : "";
      const software = /swiftshader|llvmpipe|software|microsoft basic/i.test(renderer);
      setTier(software ? 0 : 3);
    } catch {
      setTier(0);
    }
  }, []);

  return tier;
}

export default useGpuTier;
