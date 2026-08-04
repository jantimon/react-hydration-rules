/** @file useSyncExternalStore with a server/client snapshot mismatch (useIsSSR pattern) */
import React, { Suspense, lazy, useSyncExternalStore } from "react";
import { hydrateRoot } from "react-dom/client";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const clientSideDelay = () =>
  typeof window !== "undefined" ? sleep(3000) : Promise.resolve();

let LazyChild = lazy(() =>
  clientSideDelay().then(() =>
    import("./fixtures/LazyChild").then((module) => ({
      default: module.LazyChild,
    })),
  ),
);

// useIsSSR pattern - see https://kurtextrem.de/posts/react-uses-hydration for more details
const emptySubscribe = () => () => {};
const returnFalse = () => false;
const trueOnServerOrHydration = () => true;

const useIsSSR = () =>
  useSyncExternalStore(emptySubscribe, returnFalse, trueOnServerOrHydration);

const App = () => {
  const isSSR = useIsSSR();

  return (
    <div>
      <button>{isSSR ? "Server output" : "Client output"}</button>

      <Suspense fallback={<p>Suspense Boundary Fallback</p>}>
        <p>Suspense Boundary Content</p>
        <LazyChild />
      </Suspense>
    </div>
  );
};

if (typeof window !== "undefined") {
  const container = document.getElementById("root");
  if (container) {
    hydrateRoot(container, <App />);
  }
}

export default App;
