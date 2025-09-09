import { fireEvent, screen } from "@testing-library/react";
import React, { Suspense, lazy, useState, useTransition } from "react";
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

const SuspenseTriggerOnTransitionUpdateComponent: React.FC = () => {
  const [counter, setCounter] = useState(0);
  const [, startTransition] = useTransition();

  const handleIncrementCounter = () => {
    startTransition(() => {
      setCounter((prev) => prev + 1);
    });
  };

  return (
    <div>
      <button onClick={handleIncrementCounter}>Counter: {counter}</button>

      <Suspense fallback={<p>Suspended</p>}>
        <p>Not Suspended</p>
        <LazyChild />
      </Suspense>
    </div>
  );
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("use transition-wrapped state does NOT trigger Suspense fallback during React 18 lazy hydration", async () => {
  // Step 1: Render and hydrate component using helper
  await renderAndHydrate(<SuspenseTriggerOnTransitionUpdateComponent />, () =>
    resetLazyCache(),
  );

  // Verify initial SSR state - counter button should be rendered
  expect(screen.getByRole("button")).toHaveTextContent("Counter: 0");
  // SSR should show non-suspended content initially
  expect(await screen.findAllByText("Not Suspended")).toHaveLength(1);

  // Step 2: Click the counter button to trigger transition-wrapped state change
  const counterButton = screen.getByRole("button");
  fireEvent.click(counterButton);

  // Step 3: Verify suspense fallback is STILL triggered even with startTransition
  // During hydration, transitions don't prevent Suspense fallbacks when lazy components are loading
  expect(await screen.findByText("Not Suspended")).toBeInTheDocument();

  await sleep(100);
  expect(screen.queryByText("Suspended")).not.toBeInTheDocument();
});
