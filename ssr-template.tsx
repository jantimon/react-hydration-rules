import React from "react";
import { renderToPipeableStream } from "react-dom/server.node";
import { Writable } from "stream";

interface HtmlWebpackPluginOptions {
  title?: string;
  chunks?: string[];
  filename?: string;
  inject?: boolean;
  [key: string]: any;
}

interface TemplateParameters {
  htmlWebpackPlugin?: {
    options?: HtmlWebpackPluginOptions;
    files?: {
      publicPath: string;
      js: string[];
      css: string[];
      manifest?: string;
      favicon?: string;
    };
    tags?: {
      headTags: any[];
      bodyTags: any[];
    };
  };
  webpackConfig?: any;
  compilation?: any;
}

interface RequireContext {
  (id: string): any;
  keys(): string[];
  resolve(id: string): string;
  id: string;
}

declare const require: {
  context(
    directory: string,
    useSubdirectories?: boolean,
    regExp?: RegExp,
    mode?: "sync" | "eager" | "weak" | "lazy" | "lazy-once",
  ): RequireContext;
  resolve(id: string): string;
  cache: Record<string, any>;
};

function getComponentForEntry(
  templateParameters: TemplateParameters,
): React.ReactElement {
  const options = templateParameters.htmlWebpackPlugin?.options || {};
  const sourceFile = options.sourceFile;

  if (!sourceFile) {
    throw new Error(`No sourceFile specified in webpack plugin options`);
  }

  // Use require.context to get all tsx files in src
  const requireContext: RequireContext = require.context(
    "./src/",
    true,
    /\.tsx$/,
  );

  // Find the exact file path
  // sourceFile comes as "src/ComponentName.tsx", but keys are like "./ComponentName.tsx"
  const normalizedSourceFile = sourceFile.replace(/^src\//, "./");
  const componentPath = requireContext.keys().find((key: string) => {
    return key === normalizedSourceFile;
  });

  if (!componentPath) {
    throw new Error(`No component found for sourceFile "${sourceFile}"`);
  }

  console.log(`Loading component from: ${componentPath}`);
  const module = requireContext(componentPath);
  const Component = module.default || module;

  if (typeof Component !== "function") {
    throw new Error(`Invalid component found for sourceFile "${sourceFile}"`);
  }

  return React.createElement(Component);
}

export default async function ssrTemplate(
  templateParameters: TemplateParameters,
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Extract entry name from options or chunks
    const options = templateParameters.htmlWebpackPlugin?.options || {};
    const chunks = options.chunks || [];
    const entryName = chunks[0] || "default";

    console.log("SSR Template - Entry:", entryName, "Options:", options);

    try {
      const element = getComponentForEntry(templateParameters);

      const { pipe } = renderToPipeableStream(element, {
        onShellReady() {
          const chunks: Buffer[] = [];
          const writableStream = new Writable({
            write(
              chunk: any,
              _encoding: BufferEncoding,
              callback: (error?: Error | null) => void,
            ) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
              callback();
            },
          });

          writableStream.on("finish", () => {
            const html = Buffer.concat(chunks).toString("utf8");

            // Create complete HTML document
            const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title || "React App"}</title>
</head>
<body>
    <div id="root">${html}</div>

    <script src="https://unpkg.com/github-corner-element"></script>
    <github-corner title="Example Source Code" href="https://github.com/jantimon/react-hydration-rules/tree/main/src/${templateParameters.htmlWebpackPlugin?.options?.chunks?.[0]}.tsx"></github-corner>
</body>
</html>`;

            resolve(fullHtml);
          });

          writableStream.on("error", reject);
          pipe(writableStream);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          console.error("SSR Error:", error);
        },
      });
    } catch (error) {
      reject(error);
    }
  });
}
