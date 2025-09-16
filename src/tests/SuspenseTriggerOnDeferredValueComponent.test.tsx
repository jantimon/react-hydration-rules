import { fireEvent, screen } from "@testing-library/react";
import React, { Suspense, lazy, useState, useDeferredValue } from "react";
import { renderAndHydrate } from "./reactRendering";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const resetLazyCache = () => {
  LazyChild = lazy(() =>
    sleep(300).then(() =>
      import("./fixtures/LazyChild").then((module) => ({
        default: module.LazyChild,
      })),
    ),
  );
};
let LazyChild = lazy(() =>
  import("./fixtures/LazyChild").then((module) => ({
    default: module.LazyChild,
  })),
);

const ChildWithSuspense = () => (
  <Suspense fallback={<p>Suspense Boundary Fallback</p>}>
    <p>Suspense Boundary Content</p>
    <LazyChild />
  </Suspense>
);

const SuspenseTriggerOnDeferredValueComponent: React.FC = () => {
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

test("state change with useDeferredValue triggers Suspense fallback during React 18 lazy hydration", async () => {
  // Step 1: Render and hydrate component using helper
  await renderAndHydrate(<SuspenseTriggerOnDeferredValueComponent />, () =>
    resetLazyCache(),
  );

  // Verify initial SSR state - counter button should be rendered
  expect(screen.getByRole("button")).toHaveTextContent("Counter: 0");
  // SSR should show non-suspended content initially
  expect(await screen.findAllByText("Suspense Boundary Content")).toHaveLength(
    1,
  );

  // Step 2: Click the counter button to trigger state change
  const counterButton = screen.getByRole("button");
  fireEvent.click(counterButton);

  // Verify counter incremented
  expect(counterButton).toHaveTextContent("Counter: 1");

  // Step 3: Verify suspense fallback is triggered by state change
  expect(
    await screen.findByText("Suspense Boundary Content"),
  ).toBeInTheDocument();
});

afterEach(() => {
  document.body.innerHTML = "";
});
