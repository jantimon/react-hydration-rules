/** @file useSyncExternalStore + useDeferredValue with a memoized children render prop (useChildrenWithData pattern) */
import React, {
  Suspense,
  lazy,
  useMemo,
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

// useChildrenWithData pattern - see https://kurtextrem.de/posts/react-uses-hydration for more details
const emptySubscribe = () => () => {};
const returnFalse = () => false;
const trueOnServerOrHydration = () => true;

const useChildrenWithData = (children: (isSSR: boolean) => React.ReactNode) => {
  const isSSRSync = useSyncExternalStore(
    emptySubscribe,
    returnFalse,
    trueOnServerOrHydration,
  );
  const isSSR = useDeferredValue(isSSRSync);
  return useMemo(() => children(isSSR), [isSSR, children]);
};

// the children render prop must be referentially stable so the memoized
// elements don't change during the forced synchronous render pass
const renderContent = (isSSR: boolean) => (
  <div>
    <button>{isSSR ? "Server output" : "Client output"}</button>

    <Suspense fallback={<p>Suspense Boundary Fallback</p>}>
      <p>Suspense Boundary Content</p>
      <LazyChild />
    </Suspense>
  </div>
);

const App = () => <>{useChildrenWithData(renderContent)}</>;

if (typeof window !== "undefined") {
  const container = document.getElementById("root");
  if (container) {
    hydrateRoot(container, <App />);
  }
}

export default App;
