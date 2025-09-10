import { fireEvent, screen } from "@testing-library/react";
import React, { Suspense, lazy, useReducer } from "react";
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

type CounterAction = { type: "increment" } | { type: "return_prev" };

const counterReducer = (state: number, action: CounterAction): number => {
  switch (action.type) {
    case "increment":
      return state + 1;
    case "return_prev":
      return state; // Returns previous value unchanged
    default:
      return state;
  }
};

const NoSuspenseOnSameReducerValueComponent: React.FC = () => {
  const [counter, dispatch] = useReducer(counterReducer, 0);

  const handleReturnPrevValue = () => {
    dispatch({ type: "return_prev" });
  };

  return (
    <div>
      <button onClick={handleReturnPrevValue}>Counter: {counter}</button>

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

test("reducer returning previous value does NOT trigger Suspense fallback during React 18 lazy hydration", async () => {
  // Step 1: Render and hydrate component using helper
  await renderAndHydrate(<NoSuspenseOnSameReducerValueComponent />, () =>
    resetLazyCache(),
  );

  // Verify initial SSR state - counter button should be rendered
  expect(screen.getByRole("button")).toHaveTextContent("Counter: 0");
  // SSR should show non-suspended content initially
  expect(await screen.findAllByText("Suspense Boundary Content")).toHaveLength(
    1,
  );

  // Step 2: Click button to dispatch action that returns previous value
  const counterButton = screen.getByRole("button");
  fireEvent.click(counterButton);

  // Verify counter stays the same
  expect(counterButton).toHaveTextContent("Counter: 0");

  // Step 3: Verify suspense fallback is NOT triggered (should remain non-suspended)
  expect(screen.getByText("Suspense Boundary Content")).toBeInTheDocument();
  await expect(() =>
    screen.findByText("Suspense Boundary Fallback"),
  ).rejects.toThrow();
});
