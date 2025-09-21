/** @file Rendering isPending state breaks optimization */
import React, { Suspense, lazy, useState, useTransition } from "react";
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

const SuspenseTriggerOnIsPendingRenderComponent = () => {
  const [counter, setCounter] = useState(0);
  const [isPending, startTransition] = useTransition();

  const handleIncrementCounter = () => {
    startTransition(() => {
      setCounter((prev) => prev + 1);
    });
  };

  return (
    <div>
      <button onClick={handleIncrementCounter}>
        Counter: {counter} {isPending && "(pending)"}
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
    hydrateRoot(container, <SuspenseTriggerOnIsPendingRenderComponent />);
  }
}

export default SuspenseTriggerOnIsPendingRenderComponent;
