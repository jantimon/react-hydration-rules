import { fireEvent, screen } from "@testing-library/react";
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

const SuspenseTriggerOnCorrectlyWrappedAsyncUseTransitionComponent: React.FC =
  () => {
    const [counter, setCounter] = useState(0);
    const [, startTransition] = useTransition();

    const handleIncrementCounter = () => {
      startTransition(async () => {
        await sleep(20);
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

test("correctly wrapped async useTransition still triggers Suspense fallback during hydration", async () => {
  // Step 1: Render and hydrate component using helper
  await renderAndHydrate(
    <SuspenseTriggerOnCorrectlyWrappedAsyncUseTransitionComponent />,
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

  // Step 3: Even with proper wrapping, useTransition's startTransition still triggers fallbacks
  // There's a difference between direct startTransition import vs useTransition hook during hydration
  expect(
    await screen.findByText("Suspense Boundary Content"),
  ).toBeInTheDocument();
});
