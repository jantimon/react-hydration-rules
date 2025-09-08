import React from "react";
import { renderToPipeableStream } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { Writable } from "node:stream";

interface RenderResult {
  container: HTMLDivElement;
  ssrHtml: string;
}

/**
 * Helper function for testing React components with Server-Side Rendering (SSR) and hydration.
 *
 * @param component - The React component to render and hydrate
 * @param waitFor - Whether to wait for "shellReady" or "allReady"
 * @returns A promise resolving to an object containing container and ssrHtml
 */
export async function renderAndHydrate(
  component: React.ReactElement,
  beforeHydration?: (() => Promise<void>) | (() => void),
  waitFor: "shellReady" | "allReady" = "allReady",
): Promise<RenderResult> {
  const ssrHtml = await new Promise<string>((resolve, reject) => {
    let html = "";

    // Create a writable stream to collect HTML
    const writableStream = new Writable({
      write(chunk: any, _encoding: any, callback: any) {
        html += chunk.toString();
        callback();
      },
    });

    const stream = renderToPipeableStream(component, {
      onShellReady() {
        if (waitFor === "shellReady") {
          stream.pipe(writableStream);
          writableStream.end(() => resolve(html));
        }
      },

      onAllReady() {
        if (waitFor === "allReady") {
          stream.pipe(writableStream);
          writableStream.end(() => resolve(html));
        }
      },

      onShellError(error: unknown) {
        reject(
          new Error(
            `Shell rendering failed: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      },

      onError(error: unknown) {
        console.error("Rendering error:", error);
      },
    });
  });

  // Create container and set SSR HTML
  const container = document.createElement("div");
  container.innerHTML = ssrHtml;
  document.body.appendChild(container);

  await beforeHydration?.();

  // Hydrate the component
  hydrateRoot(container, component);

  return { container, ssrHtml };
}
