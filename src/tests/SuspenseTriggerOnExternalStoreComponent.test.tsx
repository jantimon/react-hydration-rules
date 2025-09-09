import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderAndHydrate } from "./reactRendering";
import React, { Suspense, lazy, useSyncExternalStore } from "react";

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

// Simple external store implementation
class CounterStore {
  private value = 0;
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => {
    return this.value;
  };

  increment = () => {
    this.value += 1;
    this.listeners.forEach((listener) => listener());
  };
}

const counterStore = new CounterStore();

const SuspenseTriggerOnExternalStoreComponent: React.FC = () => {
  const counter = useSyncExternalStore(
    counterStore.subscribe,
    counterStore.getSnapshot,
    counterStore.getSnapshot, // getServerSnapshot for SSR
  );

  const handleIncrementCounter = () => {
    counterStore.increment();
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
  // Reset external store state
  counterStore["value"] = 0;
});

test("external store change triggers Suspense fallback during React 18 lazy hydration", async () => {
  // Step 1: Render and hydrate component using helper
  await renderAndHydrate(<SuspenseTriggerOnExternalStoreComponent />, () =>
    resetLazyCache(),
  );

  // Verify initial SSR state - counter button should be rendered
  expect(screen.getByRole("button")).toHaveTextContent("Counter: 0");
  // SSR should show non-suspended content initially
  expect(await screen.findAllByText("Not Suspended")).toHaveLength(1);

  // Step 2: Click the counter button to trigger external store change
  const counterButton = screen.getByRole("button");
  fireEvent.click(counterButton);

  // Verify counter incremented
  await waitFor(() => {
    expect(counterButton).toHaveTextContent("Counter: 1");
  });

  // Step 3: Verify suspense fallback is triggered by external store change
  // External store mutations cannot be marked as non-blocking transitions
  expect(await screen.findByText("Suspended")).toBeInTheDocument();
});
