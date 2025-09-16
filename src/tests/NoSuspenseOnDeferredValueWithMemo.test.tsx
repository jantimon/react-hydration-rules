import { fireEvent, screen } from "@testing-library/react";
import React, { Suspense, lazy, useState, useDeferredValue, memo } from "react";
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

const ChildWithSuspense = memo(() => (
  <Suspense fallback={<p>Suspense Boundary Fallback</p>}>
    <p>Suspense Boundary Content</p>
    <LazyChild />
  </Suspense>
));

const NoSuspenseOnDeferredValueWithMemoComponent: React.FC = () => {
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

afterEach(() => {
  document.body.innerHTML = "";
});

test("useState change with useDeferredValue and React.memo does NOT trigger Suspense fallback during React 18 lazy hydration", async () => {
  // Step 1: Render and hydrate component using helper
  await renderAndHydrate(<NoSuspenseOnDeferredValueWithMemoComponent />, () =>
    resetLazyCache(),
  );

  // Verify initial SSR state - counter button should be rendered
  expect(screen.getByRole("button")).toHaveTextContent("Counter: 0");
  // SSR should show non-suspended content initially
  expect(await screen.findAllByText("Suspense Boundary Content")).toHaveLength(
    1,
  );

  // Step 2: Click button to trigger state change
  const counterButton = screen.getByRole("button");
  fireEvent.click(counterButton);

  // Step 3: Verify suspense fallback is NOT triggered
  // The memoized child component should prevent re-rendering when deferred value lags behind
  expect(screen.getByText("Suspense Boundary Content")).toBeInTheDocument();
  await expect(() =>
    screen.findByText("Suspense Boundary Fallback"),
  ).rejects.toThrow();

  // The counter should eventually update to show the new value
  expect(await screen.findByText("Counter: 1")).toBeInTheDocument();
});
