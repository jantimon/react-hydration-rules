import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderAndHydrate } from "./reactRendering";
import React, {Suspense, lazy, useState, useTransition, startTransition, memo, useEffect} from "react";

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

const SuspenseTriggerOnUseTransitionUpdateComponent: React.FC = () => {
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

      <Suspense fallback={<p>Suspended</p>}>
        <p>Not Suspended</p>
        <LazyChild />
      </Suspense>
    </div>
  );
};

const ChildThatSuspends = React.FB = memo(() => {
    return (
        <Suspense fallback={<p>Suspended</p>}>
            <p>Not Suspended</p>
            <LazyChild />
        </Suspense>
    )
});

const SuspenseTriggerOnUseTransitionUpdateMemoComponent: React.FC = () => {
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

           <ChildThatSuspends />
        </div>
    );
};



const SuspenseTriggerOnTransitionUpdateComponent: React.FC = () => {
    const [counter, setCounter] = useState(0);

    const handleIncrementCounter = () => {
        startTransition(() => {
            setCounter((prev) => prev + 1);
        });
    };
    return (
        <div>
            <button onClick={handleIncrementCounter}>
                Counter: {counter}
            </button>

            <Suspense fallback={<p>Suspended</p>}>
                <p>Not Suspended</p>
                <LazyChild />
            </Suspense>
        </div>
    );
};

beforeEach(() => {
    resetLazyCache();
})
afterEach(() => {
  document.body.innerHTML = "";
});

test("useTransition-wrapped state change will triggers Suspense fallback during React 18 lazy hydration if pending flows in", async () => {
  // Step 1: Render and hydrate component using helper
  await renderAndHydrate(<SuspenseTriggerOnUseTransitionUpdateComponent />, () =>
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

  // Step 2: Click the counter button to trigger transition-wrapped state change
  const counterButton = screen.getByRole("button");
  fireEvent.click(counterButton);

  // Verify counter incremented and shows pending state
  expect(counterButton).toHaveTextContent("Counter: 1");

  // Step 3: Verify suspense fallback IS triggered, because the sync update for isPending
  // flows into the suspended boundary un-memoized, forcing the fallback to be shown.
  // During hydration, will otherwise prevent Suspense fallbacks when lazy components are loading.
  expect(await screen.findByText("Suspended")).toBeInTheDocument();
});

test("useTransition-wrapped state change does not trigger Suspense fallback if memo'd during React 18 lazy hydration", async () => {
    // Step 1: Render and hydrate component using helper
    await renderAndHydrate(<SuspenseTriggerOnUseTransitionUpdateMemoComponent />, () =>
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

    // Step 2: Click the counter button to trigger transition-wrapped state change
    const counterButton = screen.getByRole("button");
    expect(counterButton).toHaveTextContent("Counter: 0");
    fireEvent.click(counterButton);
    
    // Verify counter incremented and shows pending state
    expect(counterButton).toHaveTextContent("Counter: 1");

    // Step 3: Verify suspense fallback is NOT triggered with startTransition.
    // During hydration, transitions prevent Suspense fallbacks when lazy components are loading,
    // Unless a synchronous update (such as the isPending update for useTransition),
    // flows into the boundary without being memoized.
    expect(await screen.findByText("Not Suspended")).toBeInTheDocument();
});

test("startTransition-wrapped state change does not trigger Suspense fallback during React 18 lazy hydration", async () => {
    // Step 1: Render and hydrate component using helper
    await renderAndHydrate(<SuspenseTriggerOnTransitionUpdateComponent />, () =>
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

    // Step 2: Click the counter button to trigger transition-wrapped state change
    const counterButton = screen.getByRole("button");
    fireEvent.click(counterButton);

    // Verify counter not incremented
    expect(counterButton).toHaveTextContent("Counter: 0");

    // Step 3: Verify suspense fallback is NOT triggered with startTransition.
    // During hydration, transitions prevent Suspense fallbacks when lazy components are loading,
    // Unless a synchronous update (such as the isPending update for useTransition),
    // flows into the boundary without being memoized.
    expect(await screen.findByText("Not Suspended")).toBeInTheDocument();
});
