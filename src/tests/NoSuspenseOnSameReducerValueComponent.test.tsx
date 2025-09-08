import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderAndHydrate } from "./reactRendering";
import React, { Suspense, lazy, useReducer } from "react";

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

test("reducer returning previous value does NOT trigger Suspense fallback during React 18 lazy hydration", async () => {
  // Step 1: Render and hydrate component using helper
  await renderAndHydrate(<NoSuspenseOnSameReducerValueComponent />, () =>
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

  // Step 2: Click button to dispatch action that returns previous value
  const counterButton = screen.getByRole("button");
  fireEvent.click(counterButton);

  // Verify counter stays the same
  expect(counterButton).toHaveTextContent("Counter: 0");

  // Step 3: Verify suspense fallback is NOT triggered (should remain non-suspended)
  expect(screen.queryByText("Suspended")).not.toBeInTheDocument();
  expect(screen.getByText("Not Suspended")).toBeInTheDocument();
});
