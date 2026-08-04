/** @file useSyncExternalStore + useDeferredValue without memo (deferred useIsSSR pattern) */
import React, {
  Suspense,
  lazy,
  useSyncExternalStore,
  useDeferredValue,
} from "react";
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

// useIsSSR pattern - the store never emits, but the server snapshot (true)
// differs from the client snapshot (false), so React re-renders right after
// hydration - useDeferredValue keeps the value switch at deferred priority,
// but useSyncExternalStore still forces a non-concurrent render pass which
// re-renders the (non-memoized) Suspense children
const emptySubscribe = () => () => {};
const returnFalse = () => false;
const trueOnServerOrHydration = () => true;

const useIsSSR = () => {
  const isSSRSync = useSyncExternalStore(
    emptySubscribe,
    returnFalse,
    trueOnServerOrHydration,
  );
  return useDeferredValue(isSSRSync);
};

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
