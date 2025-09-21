const HtmlWebpackPlugin = require("html-webpack-plugin");
const glob = require("fast-glob");
const path = require("path");
const fs = require("fs");

// Base webpack configuration
module.exports = {
  entry: {}, // Will be populated below
  output: {
    clean: true,
    path: __dirname + "/dist",
    chunkFilename: "_chunks/[id].js",
    filename: "[name]/main.js",
  },
  module: {
    rules: [
      // Default rule for all other TypeScript/React files - use SWC without React Compiler
      {
        test: /\.tsx?$/,
        use: {
          loader: "builtin:swc-loader",
          options: {
            jsc: {
              parser: {
                syntax: "typescript",
                tsx: true,
              },
              transform: {
                react: {
                  runtime: "automatic",
                },
              },
            },
          },
        },
        exclude: /node_modules/,
      },
      // Rule for files with ?react-compiler query - use Babel with React Compiler
      {
        test: /\.tsx?$/,
        resourceQuery: /react-compiler/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              ["@babel/preset-typescript"],
              ["@babel/preset-react", { runtime: "automatic" }],
            ],
            plugins: [["babel-plugin-react-compiler", {}]],
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  plugins: [],
  mode: "development",
};

// Gather test cases from src/*.tsx
const testCases = [];
for (const file of glob.sync("src/*.tsx")) {
  const name = path.basename(file, ".tsx");
  const category = name.startsWith("SuspenseFallback")
    ? "fallback"
    : "no-fallback";
  // Regular test case without React Compiler (fallbacks and no-fallbacks)
  testCases.push({
    name,
    file,
    jsEntry: `./${file}`,
    category,
    description: getDescription(file),
  });
  // React Compiler variant for SuspenseFallback cases (to verify that react-compiler solves the fallback issues)
  if (category === "fallback") {
    const reactCompilerName = `ReactCompiler${name.replace("SuspenseFallbackOn", "")}`;
    testCases.push({
      name: reactCompilerName,
      file,
      jsEntry: `./${file}?react-compiler`,
      category: "react-compiler",
      description: `${getDescription(file)} (with React Compiler)`,
    });
  }
}

// Create an HTML Page and Javascript bundle for each test case
testCases.forEach((testCase) => {
  const htmlPath = `./${testCase.name}/index.html`;
  module.exports.entry[testCase.name] = testCase.jsEntry;
  module.exports.plugins.push(
    new HtmlWebpackPlugin({
      filename: htmlPath,
      chunks: [testCase.name],
      inject: true,
      title: testCase.name.replace(/([A-Z])/g, " $1").trim(),
      template: "./ssr-template.tsx",
      sourceFile: testCase.file,
    }),
  );
});

// Add overview page (dist/index.html)
module.exports.plugins.push(
  new HtmlWebpackPlugin({
    filename: "index.html",
    inject: false,
    title: "React 19 SSR Suspense Behavior - Demo Overview",
    template: "./overview-template.ts",
    components: testCases.sort((a, b) => a.name.localeCompare(b.name)),
  }),
);

// Helper to extract @file description from the top of a source file
function getDescription(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/\/\*\*\s*@file\s+(.+?)\s*\*\//);
  return match ? match[1].trim() : "";
}
