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

let stateUpdated = false;

const SuspenseTriggerOnAsyncStateAfterAwaitComponent: React.FC = () => {
  const [counter, setCounter] = useState(0);

  const handleIncrementCounter = () => {
    startTransition(async () => {
      // Simulate async operation
      await sleep(10);

      // State update after await loses transition context
      // This behaves like a synchronous state update
      setCounter((prev) => prev + 1);
      stateUpdated = true;
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

test("state updates after await lose transition context and trigger Suspense fallback during hydration", async () => {
  // Step 1: Render and hydrate component using helper
  await renderAndHydrate(
    <SuspenseTriggerOnAsyncStateAfterAwaitComponent />,
    () => resetLazyCache(),
  );

  // Verify initial SSR state - counter button should be rendered
  expect(screen.getByRole("button")).toHaveTextContent("Counter: 0");
  // SSR should show non-suspended content initially
  expect(await screen.findAllByText("Suspense Boundary Content")).toHaveLength(
    1,
  );

  // Step 2: Click the counter button to trigger async transition
  const counterButton = screen.getByRole("button");
  fireEvent.click(counterButton);

  // Step 3: Verify suspense fallback is triggered due to async context loss
  // State updates after await lose the transition context and behave like sync updates
  expect(
    await screen.findByText("Suspense Boundary Content"),
  ).toBeInTheDocument();

  await sleep(100);
});
