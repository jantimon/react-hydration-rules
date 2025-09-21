/** @file State updates after await (loses transition context) */
import React, { Suspense, lazy, useState, startTransition } from "react";
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

  const handleIncrementCounter = () => {
    startTransition(async () => {
      // Simulate async operation
      await sleep(100);

      // State update after await loses transition context
      // This behaves like a synchronous state update
      setCounter((prev) => prev + 1);
    });
  };

  return (
    <div>
      <button onClick={handleIncrementCounter}>Counter: {counter}</button>

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
