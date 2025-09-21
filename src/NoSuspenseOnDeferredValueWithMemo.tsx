/** @file useDeferredValue with React.memo optimization */
import React, { Suspense, lazy, useState, useDeferredValue, memo } from "react";
import { hydrateRoot } from "react-dom/client";

const clientSideDelay = () =>
  new Promise((resolve) =>
    setTimeout(resolve, typeof window !== "undefined" ? 3000 : 0),
  );

let LazyChild = lazy(() =>
  clientSideDelay().then(() =>
    import("./fixtures/LazyChild").then((module) => ({
      default: module.LazyChild,
    })),
  ),
);

const ChildWithSuspense = memo(() => (
  <Suspense fallback={<p>Suspense Boundary Fallback</p>}>
    <p>Suspense Boundary Content</p>
    <LazyChild />
  </Suspense>
));

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
      <ChildWithSuspense />
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
