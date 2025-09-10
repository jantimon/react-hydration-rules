import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderAndHydrate } from "./reactRendering";
import React, { Suspense, lazy, useState, useTransition } from "react";

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

const SuspenseTriggerOnIsPendingRenderComponent: React.FC = () => {
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

afterEach(() => {
  document.body.innerHTML = "";
});

test("rendering isPending state triggers Suspense fallback even within startTransition during hydration", async () => {
  // Step 1: Render and hydrate component using helper
  await renderAndHydrate(<SuspenseTriggerOnIsPendingRenderComponent />, () =>
    resetLazyCache(),
  );

  // Verify initial SSR state - counter button should be rendered
  expect(screen.getByRole("button")).toHaveTextContent("Counter: 0");
  // SSR should show non-suspended content initially
  expect(await screen.findAllByText("Suspense Boundary Content")).toHaveLength(
    1,
  );

  // Step 2: Click the counter button to trigger transition-wrapped state change
  const counterButton = screen.getByRole("button");
  fireEvent.click(counterButton);

  // Verify counter incremented and shows pending state
  expect(counterButton).toHaveTextContent("Counter: 1");

  // Step 3: Verify suspense fallback is triggered despite startTransition
  // This happens because rendering isPending state breaks the transition optimization
  expect(
    await screen.findByText("Suspense Boundary Fallback"),
  ).toBeInTheDocument();
});
