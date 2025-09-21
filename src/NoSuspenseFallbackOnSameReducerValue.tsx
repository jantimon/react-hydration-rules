/** @file Same-value useReducer updates (React optimization) */
import React, { Suspense, lazy, useReducer } from "react";
import { hydrateRoot } from "react-dom/client";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const clientSideDelay = () =>
  typeof window !== "undefined" ? sleep(3000) : Promise.resolve();

let LazyChild = lazy(() =>
  clientSideDelay().then(() =>
    import("./fixtures/LazyChild").then((module) => ({
      default: module.LazyChild,
    })),
  ),
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

const App = () => {
  const [counter, dispatch] = useReducer(counterReducer, 0);

  const handleSetSameValue = () => {
    dispatch({ type: "set", value: counter });
  };

  return (
    <div>
      <button onClick={handleSetSameValue}>Counter: {counter}</button>

      <Suspense fallback={<p>Suspense Boundary Fallback</p>}>
        <p>Suspense Boundary Content</p>
        <LazyChild />
      </Suspense>
    </div>
  );
};

if (typeof window !== "undefined") {
  const container = document.getElementById("root");
  if (container) {
    hydrateRoot(container, <App />);
  }
}

export default App;
