/** @file useDeferredValue without memoization */
import React, { Suspense, lazy, useState, useDeferredValue } from "react";
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

const App = () => {
  const [counter, setCounter] = useState(0);
  const deferredCounter = useDeferredValue(counter);

  const handleIncrementCounter = () => {
    setCounter((prev) => prev + 1);
  };

  return (
    <div>
      <button onClick={handleIncrementCounter}>
        Counter: {deferredCounter}
      </button>

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
