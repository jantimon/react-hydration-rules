import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderAndHydrate } from "./reactRendering";
import React, { Suspense, lazy, useReducer } from "react";

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

type CounterAction = { type: "increment" } | { type: "set"; value: number };

const counterReducer = (state: number, action: CounterAction): number => {
  switch (action.type) {
    case "increment":
      return state + 1;
    case "set":
      return action.value;
    default:
      return state;
  }
};

const SuspenseTriggerOnReducerChangeComponent: React.FC = () => {
  const [counter, dispatch] = useReducer(counterReducer, 0);

  const handleIncrementCounter = () => {
    dispatch({ type: "increment" });
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

test("reducer change triggers Suspense fallback during React 18 lazy hydration", async () => {
  // Step 1: Render and hydrate component using helper
  await renderAndHydrate(<SuspenseTriggerOnReducerChangeComponent />, () =>
    resetLazyCache(),
  );

  // Verify initial SSR state - counter button should be rendered
  expect(screen.getByRole("button")).toHaveTextContent("Counter: 0");
  // SSR should show non-suspended content initially
  expect(await screen.findAllByText("Not Suspended")).toHaveLength(1);

  // Step 2: Click the counter button to trigger reducer change
  const counterButton = screen.getByRole("button");
  fireEvent.click(counterButton);

  // Verify counter incremented
  expect(counterButton).toHaveTextContent("Counter: 1");

  // Step 3: Verify suspense fallback is triggered by reducer change
  expect(await screen.findByText("Suspended")).toBeInTheDocument();
});
