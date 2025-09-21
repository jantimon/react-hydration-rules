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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }

        .header {
            text-align: center;
            margin-bottom: 3rem;
            color: white;
        }

        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .header p {
            font-size: 1.2rem;
            opacity: 0.9;
            max-width: 600px;
            margin: 0 auto;
        }

        .section {
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
            overflow: hidden;
        }

        .section-header {
            padding: 1.5rem 2rem;
            border-bottom: 1px solid #e5e7eb;
            position: relative;
        }

        .section-header h2 {
            font-size: 1.5rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .section-header p {
            color: #6b7280;
            margin-top: 0.5rem;
            font-size: 0.95rem;
        }

        .icon {
            width: 1.5rem;
            height: 1.5rem;
            border-radius: 50%;
        }

        .icon.success {
            background: #10b981;
        }

        .icon.error {
            background: #ef4444;
        }

        .icon.compiler {
            background: linear-gradient(45deg, #8b5cf6, #3b82f6);
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 1.5rem;
            padding: 2rem;
        }

        .card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 1.5rem;
            transition: all 0.2s ease;
            background: #fafafa;
        }

        .card:hover {
            border-color: #6366f1;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
            transform: translateY(-2px);
        }

        .card h3 {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #1f2937;
        }

        .card p {
            color: #6b7280;
            font-size: 0.9rem;
            margin-bottom: 1rem;
            line-height: 1.5;
        }

        .card a {
            display: inline-flex;
            align-items: center;
            padding: 0.5rem 1rem;
            background: #6366f1;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-size: 0.9rem;
            font-weight: 500;
            transition: background-color 0.2s ease;
        }

        .card a:hover {
            background: #4f46e5;
        }

        .card a::after {
            content: '→';
            margin-left: 0.5rem;
        }

        .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            font-size: 0.75rem;
            font-weight: 500;
            border-radius: 9999px;
            margin-bottom: 0.75rem;
        }

        .badge.success {
            background: #dcfce7;
            color: #166534;
        }

        .badge.error {
            background: #fee2e2;
            color: #991b1b;
        }

        .badge.compiler {
            background: #ede9fe;
            color: #6d28d9;
        }

        .footer {
            text-align: center;
            margin-top: 3rem;
            color: white;
            opacity: 0.8;
        }

        .footer a {
            color: white;
            text-decoration: underline;
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
                padding: 1rem;
            }

            .section-header {
                padding: 1rem 1.5rem;
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
                    <span class="icon success"></span>
                    Components that DON'T trigger Suspense fallbacks
                </h2>
                <p>These patterns maintain server-rendered content during hydration, preventing performance-degrading fallbacks.</p>
            </div>
            <div class="grid">
                ${noFallbackComponents
                  .map(
                    (component) => `
                    <div class="card">
                        <span class="badge success">✅ No Fallback</span>
                        <h3>${component.name.replace(/([A-Z])/g, " $1").trim()}</h3>
                        <p>${component.description}</p>
                        <a href="./${component.name}/index.html">View Demo</a>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        </section>

        <section class="section">
            <div class="section-header">
                <h2>
                    <span class="icon error"></span>
                    Components that DO trigger Suspense fallbacks
                </h2>
                <p>These patterns cause React to discard server-rendered content and show loading spinners, hurting performance.</p>
            </div>
            <div class="grid">
                ${fallbackComponents
                  .map(
                    (component) => `
                    <div class="card">
                        <span class="badge error">💣 Triggers Fallback</span>
                        <h3>${component.name.replace(/([A-Z])/g, " $1").trim()}</h3>
                        <p>${component.description}</p>
                        <a href="./${component.name}/index.html">View Demo</a>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        </section>

        <section class="section">
            <div class="section-header">
                <h2>
                    <span class="icon compiler"></span>
                    React Compiler - Automatic Optimization
                </h2>
                <p>🎉 React Compiler's automatic memoization prevents ALL Suspense fallbacks</p>
            </div>
            <div class="grid">
                ${reactCompilerComponents
                  .map(
                    (component) => `
                    <div class="card">
                        <span class="badge compiler">🚀 React Compiler</span>
                        <h3>${component.name.replace(/([A-Z])/g, " $1").trim()}</h3>
                        <p>${component.description}</p>
                        <a href="./${component.name}/index.html">View Demo</a>
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
