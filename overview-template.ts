interface OverviewTemplateParameters {
  htmlWebpackPlugin?: {
    options?: {
      title?: string;
      components?: ComponentInfo[];
    };
  };
}

interface ComponentInfo {
  name: string;
  category: "no-fallback" | "fallback" | "react-compiler";
  description: string;
  file: string;
}

function generateOverviewHTML(components: ComponentInfo[]): string {
  const noFallbackComponents = components.filter(
    (c) => c.category === "no-fallback",
  );
  const fallbackComponents = components.filter(
    (c) => c.category === "fallback",
  );
  const reactCompilerComponents = components.filter(
    (c) => c.category === "react-compiler",
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React 19 SSR Suspense Behavior - Demo Overview</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Optimistic Display', -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #f7f7f7;
            background: #23272f;
            min-height: 100vh;
            margin: 0;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }

        .header {
            margin-bottom: 4rem;
        }

        .header h1 {
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 1rem;
            color: #f7f7f7;
            letter-spacing: -0.025em;
        }

        .header p {
            font-size: 1.125rem;
            color: #99a1b3;
            max-width: 700px;
            line-height: 1.7;
        }

        .section {
            margin-bottom: 3rem;
        }

        .section-header {
            margin-bottom: 1.5rem;
        }

        .section-header h2 {
            font-size: 1.5rem;
            font-weight: 600;
            color: #f7f7f7;
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .section-header p {
            color: #99a1b3;
            font-size: 1rem;
            line-height: 1.6;
        }

        .status-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
        }

        .status-indicator.success {
            background: #087f5b;
        }

        .status-indicator.error {
            background: #e03131;
        }

        .status-indicator.compiler {
            background: #9333ea;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            grid-template-rows: subgrid;
            gap: 1.5rem;
        }

        .card {
            background: #2d3748;
            border: 1px solid #4a5568;
            border-radius: 8px;
            padding: 1.5rem;
            transition: all 0.2s ease;
            display: grid;
            grid-template-rows: auto auto 1fr auto;
            gap: 0.75rem;
        }

        .card:hover,
        .card:has(a:focus-visible) {
            border-color: #7281a8ff;
        }

        .card-badge {
            grid-row: 1;
            justify-self: start;
        }

        .card-title {
            grid-row: 2;
            font-size: 1.25rem;
            font-weight: 600;
            margin: 0;
            color: #f7f7f7;
        }

        .card-description {
            grid-row: 3;
            color: #a0aec0;
            margin: 0;
            line-height: 1.6;
            align-self: start;
        }

        .card-button {
            grid-row: 4;
            align-self: end;
            justify-self: start;
            margin-top: 4px;
        }

        .card a {
            display: inline-flex;
            align-items: center;
            padding: 0.5rem 1rem;
            background: transparent;
            color: #63b3ed;
            text-decoration: none;
            border: 1px solid #63b3ed;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.2s ease;
            outline: none;
        }

        .card a:hover, .card a:focus-visible {
            background: #63b3ed;
            color: #1a202c;
        }

        .card a::after {
            content: '→';
            margin-left: 0.5rem;
        }

        .badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.25rem 0.75rem;
            font-size: 0.75rem;
            font-weight: 500;
            border-radius: 4px;
            margin-bottom: 1rem;
            width: fit-content;
        }

        .badge.success {
            background: rgba(8, 127, 91, 0.2);
            color: #81e6d9;
            border: 1px solid rgba(8, 127, 91, 0.3);
        }

        .badge.error {
            background: rgba(224, 49, 49, 0.2);
            color: #fc8181;
            border: 1px solid rgba(224, 49, 49, 0.3);
        }

        .badge.compiler {
            background: rgba(147, 51, 234, 0.2);
            color: #c084fc;
            border: 1px solid rgba(147, 51, 234, 0.3);
        }

        .footer {
            margin-top: 4rem;
            padding-top: 2rem;
            border-top: 1px solid #4a5568;
            color: #99a1b3;
            text-align: center;
        }

        .footer p {
            margin-bottom: 0.5rem;
        }

        .footer a {
            color: #63b3ed;
            text-decoration: none;
        }

        .footer a:hover {
            text-decoration: underline;
        }

        .footer code {
            background: #1a202c;
            border: 1px solid #4a5568;
            padding: 0.125rem 0.375rem;
            border-radius: 4px;
            font-family: 'Fira Code', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro', monospace;
            font-size: 0.875em;
        }

        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }

            .header h1 {
                font-size: 2rem;
            }

            .grid {
                grid-template-columns: 1fr;
                gap: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>React 19 SSR Suspense Behavior</h1>
            <p>Interactive demos showing what causes React to break Suspense boundaries during hydration and how React Compiler fixes these issues automatically.</p>
        </header>

        <section class="section">
            <div class="section-header">
                <h2>
                    <span class="status-indicator success"></span>
                    Components that DON'T trigger Suspense fallbacks
                </h2>
                <p>These patterns maintain server-rendered content during hydration, preventing performance-degrading fallbacks.</p>
            </div>
            <div class="grid">
                ${noFallbackComponents
                  .map(
                    (component) => `
                    <div class="card">
                        <span class="badge success card-badge">
                            <span class="status-indicator success"></span>
                            No Fallback
                        </span>
                        <h3 class="card-title">${component.name.replace(/([A-Z])/g, " $1").trim()}</h3>
                        <p class="card-description">${component.description}</p>
                        <a href="./${component.name}/index.html" class="card-button">View Demo</a>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        </section>

        <section class="section">
            <div class="section-header">
                <h2>
                    <span class="status-indicator error"></span>
                    Components that DO trigger Suspense fallbacks
                </h2>
                <p>These patterns cause React to discard server-rendered content and show loading spinners, hurting performance.</p>
            </div>
            <div class="grid">
                ${fallbackComponents
                  .map(
                    (component) => `
                    <div class="card">
                        <span class="badge error card-badge">
                            <span class="status-indicator error"></span>
                            Triggers Fallback
                        </span>
                        <h3 class="card-title">${component.name.replace(/([A-Z])/g, " $1").trim()}</h3>
                        <p class="card-description">${component.description}</p>
                        <a href="./${component.name}/index.html" class="card-button">View Demo</a>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        </section>

        <section class="section">
            <div class="section-header">
                <h2>
                    <span class="status-indicator compiler"></span>
                    React Compiler - Automatic Optimization
                </h2>
                <p>React Compiler's automatic memoization prevents ALL Suspense fallbacks</p>
            </div>
            <div class="grid">
                ${reactCompilerComponents
                  .map(
                    (component) => `
                    <div class="card">
                        <span class="badge compiler card-badge">
                            <span class="status-indicator compiler"></span>
                            React Compiler
                        </span>
                        <h3 class="card-title">${component.name.replace(/([A-Z])/g, " $1").trim()}</h3>
                        <p class="card-description">${component.description}</p>
                        <a href="./${component.name}/index.html" class="card-button">View Demo</a>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        </section>

        <footer class="footer">
            <p>All demos use real SSR with <code>renderToPipeableStream</code> and actual hydration with <code>hydrateRoot</code>.</p>
            <p>Click any demo to interact with the components and observe Suspense behavior during hydration.</p>
        </footer>
    </div>
</body>
</html>`;
}

export default function overviewTemplate(
  templateParameters: OverviewTemplateParameters,
): string {
  const options = templateParameters.htmlWebpackPlugin?.options || {};
  const components = options.components || [];

  return generateOverviewHTML(components);
}
