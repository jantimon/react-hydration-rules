import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderAndHydrate } from "./reactRendering";
import React, { Suspense, lazy, useState } from "react";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const resetLazyCache = () => {
  LazyChild = lazy(() =>
    sleep(1000).then(() =>
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

const SuspenseTriggerOnStateChangeComponent: React.FC = () => {
  const [counter, setCounter] = useState(0);

  const handleIncrementCounter = () => {
    setCounter((prev) => prev + 1);
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

test("state change triggers Suspense fallback during React 18 lazy hydration", async () => {
  // Step 1: Render and hydrate component using helper
  await renderAndHydrate(<SuspenseTriggerOnStateChangeComponent />, () =>
    resetLazyCache(),
  );

  // Verify initial SSR state - counter button should be rendered
  expect(screen.getByRole("button")).toHaveTextContent("Counter: 0");
  // SSR should show non-suspended content initially
  expect(await screen.findAllByText("Not Suspended")).toHaveLength(1);

  // Wait for hydration to complete
  await waitFor(() => {
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  // Step 2: Click the counter button to trigger state change
  const counterButton = screen.getByRole("button");
  fireEvent.click(counterButton);

  // Verify counter incremented
  expect(counterButton).toHaveTextContent("Counter: 1");

  // Step 3: Verify suspense fallback is triggered by state change
  expect(await screen.findByText("Suspended")).toBeInTheDocument();
});

afterEach(() => {
  document.body.innerHTML = "";
});
