import { fireEvent, screen } from "@testing-library/react";
import { renderAndHydrate } from "./reactRendering";
import React, { Suspense, lazy, useState, startTransition } from "react";

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

const NoSuspenseTriggerOnCorrectlyWrappedAsyncTransitionComponent: React.FC =
  () => {
    const [counter, setCounter] = useState(0);

    const handleIncrementCounter = () => {
      startTransition(async () => {
        // Simulate async operation
        await sleep(10);

        // Correctly wrap state update after await in another startTransition
        // This preserves the transition context and prevents Suspense fallbacks
        startTransition(() => {
          setCounter((prev) => prev + 1);
        });
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

afterEach(() => {
  document.body.innerHTML = "";
});

test("correctly wrapped async startTransition does NOT trigger Suspense fallback during hydration", async () => {
  // Step 1: Render and hydrate component using helper
  await renderAndHydrate(
    <NoSuspenseTriggerOnCorrectlyWrappedAsyncTransitionComponent />,
    () => resetLazyCache(),
  );

  // Verify initial SSR state - counter button should be rendered
  expect(screen.getByRole("button")).toHaveTextContent("Counter: 0");
  // SSR should show Suspense Boundary Content initially
  expect(await screen.findAllByText("Suspense Boundary Content")).toHaveLength(
    1,
  );

  // Step 2: Click the counter button to trigger properly wrapped async transition
  const counterButton = screen.getByRole("button");
  fireEvent.click(counterButton);

  // Step 3: Verify suspense fallback is NOT triggered during the transition
  // The nested startTransition pattern prevents fallbacks during hydration
  await sleep(100);
  expect(
    screen.queryByText("Suspense Boundary Fallback"),
  ).not.toBeInTheDocument();
  expect(screen.getByText("Suspense Boundary Content")).toBeInTheDocument();
});
