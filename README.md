# React Hydration and Suspense: The Complete Behavior Guide

Ever wonder why your perfectly server-rendered content suddenly flashes to a loading spinner when users click something? You're not alone. React's hydration phase has some counterintuitive rules that can catch even experienced developers off guard.

I spent way too much time debugging these behaviors in production, so I built this test suite to document exactly when and why Suspense fallbacks trigger during hydration. Some of the patterns might surprise you.

> [!WARNING]
> Error: A component suspended while responding to synchronous input. This will cause the UI to be replaced with a loading indicator. To fix, updates that suspend should be wrapped with startTransition.

## 🎯 The Hydration Challenge

When React hydrates server-rendered content, it needs to make components interactive while keeping the UI consistent. React 19 introduced improvements to [selective hydration and concurrent rendering](https://github.com/reactwg/react-18/discussions/37), but there are some tricky parts worth understanding.

### Key Insight: Synchronous State Changes Overrule Suspense During Hydration

> [!CAUTION]
> **State updates during hydration always break Suspense** → your server-rendered content will flash to loading spinners. You can prevent this by wrapping these state changes with `startTransition`

## 🚀 Quick Solutions (90% of cases)

**Problem**: Server-rendered content flashes to loading spinner when users interact

**Solutions**:

1. **Wrap state updates in `startTransition`** ← fixes most cases

   ```jsx
   import { startTransition } from "react";
   const handleClick = () => startTransition(() => setCount((c) => c + 1));
   ```

2. **For async operations, double-wrap**

   ```jsx
   import { startTransition } from "react"; // ← does NOT work with useTransition
   const handleClick = () =>
     startTransition(async () => {
       await api.call();
       startTransition(() => setCount((c) => c + 1)); // ← key part
     });
   ```

3. **External stores always trigger fallbacks** - no real workaround

   ```jsx
   const value = useSyncExternalStore(subscribe, getSnapshot);
   // Any mutation will trigger fallback - consider alternatives
   ```

4. **For server/client snapshot mismatches (`useIsSSR` pattern), combine `useDeferredValue` with `React.memo`**

   ```jsx
   const isSSRSync = useSyncExternalStore(emptySubscribe, returnFalse, returnTrue);
   const isSSR = useDeferredValue(isSSRSync); // ⬅️ defers the switch ...
   // ... but only prevents fallbacks if the Suspense subtree is wrapped in React.memo
   ```

**Update**: react-compiler seems completely to prevent ALL Suspense fallbacks during hydration

**Need the full details?** Just read on

```mermaid
flowchart TD
    A[User Interaction] --> B{React Compiler Enabled?}

    B -->|Yes| RC[🎉 React Compiler]
    RC --> RCE[✅ No Fallbacks Ever]

    B -->|No| C{App Hydrated?}

    C -->|No - During Hydration| D{State Update?}
    C -->|Yes - Post Hydration| E{State Update?}

    D -->|No Change| F[✅ No Fallback]
    D -->|Same Value| G{React Optimization}
    D -->|New Value| H{External Store?}

    G -->|useState/useReducer| F
    G -->|External Store| I[💣 Suspense Fallback]

    H -->|Yes - useSyncExternalStore| I[💣 Always Triggers]
    H -->|No| J{Wrapped in Transition?}

    J -->|No| I[💣 Suspense Fallback]
    J -->|Yes| K{Async Operation?}

    K -->|No - Sync| L{Rendering isPending?}
    K -->|Yes - Async| M{When is State Update?}

    L -->|Yes| I[💣 Suspense Fallback]
    L -->|No| F[✅ No Fallback]

    M -->|Pre-await| F[✅ No Fallback]
    M -->|Post-await| N{Correctly Wrapped?}

    N -->|No - Lost Context| I[💣 Suspense Fallback]
    N -->|Yes| O{Which startTransition?}

    O -->|Direct Import| P{Rendering isPending?}
    O -->|useTransition Hook| I[💣 Still Triggers]

    P -->|Yes| I[💣 Suspense Fallback]
    P -->|No| F[✅ No Fallback]

    E -->|No Change| F
    E -->|Same Value| F
    E -->|New Value| Q{External Store?}

    Q -->|Yes| R[💣 Always Triggers]
    Q -->|No| S{Wrapped in Transition?}

    S -->|Yes| T[⚡ Prevents Fallback]
    S -->|No| U[💣 May Trigger Fallback]
```

## 📊 Behavior Matrix Overview

| Update Type                                                    | Behavior                  | React Compiler            | Notes                                                                                                                                                                           | Source Code                                                          |
| -------------------------------------------------------------- | ------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `useState`<br>(**new** value)                                  | 💣 **Triggers fallback**  | ✅ **Prevents fallbacks** | Without transition wrapper causes Suspense fallback¹⁾ ([React team guidance](https://github.com/facebook/react/issues/24476#issuecomment-1127800350))                           | [code](src/SuspenseFallbackOnStateChange.tsx)                        |
| `useState`<br>(**same** value)                                 | ✅ **Never triggers**     |                           | React's built-in optimization prevents fallback                                                                                                                                 | [code](src/NoSuspenseFallbackOnSameStateValue.tsx)                   |
| `useReducer`<br>(**new** value)                                | 💣 **Triggers fallback**  | ✅ **Prevents fallbacks** | Without transition wrapper causes Suspense fallback¹⁾ ([React team guidance](https://github.com/facebook/react/issues/24476#issuecomment-1127800350))                           | [code](src/SuspenseFallbackOnReducerChange.tsx)                      |
| `useReducer`<br>(**same** value)                               | ✅ **Never triggers**     |                           | React's built-in optimization prevents fallback                                                                                                                                 | [code](src/NoSuspenseFallbackOnSameReducerValue.tsx)                 |
| `startTransition`<br>(sync - direct import)                    | ✅ **Prevents fallbacks** |                           | Direct import of startTransition works effectively during hydration                                                                                                             | [code](src/NoSuspenseFallbackOnTransitionUpdate.tsx)                 |
| `useTransition`<br>(sync - hook)                               | 💣 **Triggers fallback**  | ✅ **Prevents fallbacks** | useTransition hook triggers fallbacks during hydration¹⁾                                                                                                                        | [code](src/SuspenseFallbackOnUseTransitionUpdate.tsx)                |
| `startTransition`<br>(async - post-await)                      | 💣 **Triggers fallback**  | ✅ **Prevents fallbacks** | React loses transition context after await¹⁾ ([See React docs](https://react.dev/reference/react/useTransition#react-doesnt-treat-my-state-update-after-await-as-a-transition)) | [code](src/SuspenseFallbackOnAsyncStateAfterAwait.tsx)               |
| `startTransition`<br>(correctly wrapped async - direct import) | ✅ **Prevents fallbacks** |                           | Nested startTransition from direct import preserves context during hydration                                                                                                    | [code](src/NoSuspenseFallbackOnCorrectlyWrappedAsyncTransition.tsx)  |
| `startTransition`<br>(correctly wrapped async - useTransition) | 💣 **Still triggers**     | ✅ **Prevents fallbacks** | Nested startTransition from useTransition hook triggers fallbacks during hydration¹⁾                                                                                            | [code](src/SuspenseFallbackOnCorrectlyWrappedAsyncUseTransition.tsx) |
| `startTransition` + `isPending` render                         | 💣 **Still triggers**     | ✅ **Prevents fallbacks** | Rendering isPending state breaks transition optimization¹⁾                                                                                                                      | [code](src/SuspenseFallbackOnIsPendingRender.tsx)                    |
| `useDeferredValue`                                             | 💣 **Triggers fallback**  | ✅ **Prevents fallbacks** | Deferred values trigger fallbacks during hydration¹⁾                                                                                                                            | [code](src/SuspenseFallbackOnDeferredValue.tsx)                      |
| `useDeferredValue` + `React.memo`                              | ✅ **Prevents fallbacks** |                           | Memoized components prevent re-renders during deferred updates ([See React docs pitfall](https://react.dev/reference/react/useDeferredValue#pitfall))                           | [code](src/NoSuspenseFallbackOnDeferredValueWithMemo.tsx)            |
| `useSyncExternalStore`                                         | 💣 **Always triggers**    | ✅ **Prevents fallbacks** | Cannot benefit from transitions at any phase¹⁾ ([See docs](https://react.dev/reference/react/useSyncExternalStore#caveats))                                                     | [code](src/SuspenseFallbackOnExternalStore.tsx)                      |
| `useSyncExternalStore`<br>(server/client mismatch)             | 💣 **Triggers fallback**  | ✅ **Prevents fallbacks** | `useIsSSR` pattern: a differing `getServerSnapshot` forces a synchronous re-render right after hydration¹⁾ ([See kurtextrem.de](https://kurtextrem.de/posts/react-uses-hydration)) | [code](src/SuspenseFallbackOnExternalStoreMismatch.tsx)              |
| `useSyncExternalStore`<br>+ `useDeferredValue`                 | 💣 **Still triggers**     | ✅ **Prevents fallbacks** | Deferring the value switch is not enough - the store still forces a non-concurrent render pass¹⁾                                                                                | [code](src/SuspenseFallbackOnDeferredExternalStoreMismatch.tsx)      |
| `useSyncExternalStore`<br>+ `useDeferredValue` + `React.memo`  | ✅ **Prevents fallbacks** |                           | Memoization shields the Suspense boundary from the forced synchronous render pass                                                                                               | [code](src/NoSuspenseFallbackOnDeferredExternalStoreMismatchWithMemo.tsx) |

¹⁾ React Compiler's automatic memoization prevents fallbacks

### 💣 What Triggers Suspense Fallbacks

Even if the server includes the full HTML for a **lazy** component, certain patterns during hydration will still trigger Suspense fallbacks and remove the existing content

![useTransition vs startTransition](https://github.com/user-attachments/assets/b6d10cd0-71aa-425f-aedf-55942de2b353)  
See for yourself directly in your browser: [useTransition](https://jantimon.github.io/react-hydration-rules/SuspenseFallbackOnUseTransitionUpdate/index.html) vs [startTransition](https://jantimon.github.io/react-hydration-rules/NoSuspenseFallbackOnTransitionUpdate/index.html)

**Regular State Updates** ([SuspenseFallbackOnStateChange.tsx](src/SuspenseFallbackOnStateChange.tsx))

```jsx
const [count, setCount] = useState(0);
const handleClick = () => setCount((prev) => prev + 1); // 💣 Triggers fallback
```

**Reducer Updates** ([SuspenseFallbackOnReducerChange.tsx](src/SuspenseFallbackOnReducerChange.tsx))

```jsx
const [state, dispatch] = useReducer(reducer, initialState);
const handleClick = () => dispatch({ type: "increment" }); // 💣 Triggers fallback
```

**External Store Changes** ([SuspenseFallbackOnExternalStore.tsx](src/SuspenseFallbackOnExternalStore.tsx))

```jsx
const value = useSyncExternalStore(subscribe, getSnapshot);
// Any external store mutation 💣 Always triggers fallback
```

**Server/Client Snapshot Mismatch** ([SuspenseFallbackOnExternalStoreMismatch.tsx](src/SuspenseFallbackOnExternalStoreMismatch.tsx))

```jsx
const emptySubscribe = () => () => {};
const isSSR = useSyncExternalStore(
  emptySubscribe,
  () => false, // client snapshot
  () => true, // server snapshot
);
// 💣 The mismatch forces a sync re-render right after hydration - no interaction needed
```

**Deferred Server/Client Snapshot Mismatch** ([SuspenseFallbackOnDeferredExternalStoreMismatch.tsx](src/SuspenseFallbackOnDeferredExternalStoreMismatch.tsx))

```jsx
const isSSRSync = useSyncExternalStore(
  emptySubscribe,
  () => false,
  () => true,
);
const isSSR = useDeferredValue(isSSRSync);
// 💣 Still triggers - useSyncExternalStore forces a non-concurrent render pass
```

**useTransition Hook Updates** ([SuspenseFallbackOnUseTransitionUpdate.tsx](src/SuspenseFallbackOnUseTransitionUpdate.tsx))

```jsx
const [, startTransition] = useTransition();
const handleClick = () => {
  startTransition(() => {
    setCount((prev) => prev + 1); // 💣 Still triggers fallback during hydration with useTransition hook
  });
};
```

**Correctly Wrapped Async useTransition** ([SuspenseFallbackOnCorrectlyWrappedAsyncUseTransition.tsx](src/SuspenseFallbackOnCorrectlyWrappedAsyncUseTransition.tsx))

```jsx
const [, startTransition] = useTransition();
const handleClick = () => {
  startTransition(async () => {
    await someAsyncOperation();
    startTransition(() => {
      setCount((prev) => prev + 1); // 💣 Still triggers fallback during hydration with useTransition
    });
  });
};
```

**Async State Updates After await** ([SuspenseFallbackOnAsyncStateAfterAwait.tsx](src/SuspenseFallbackOnAsyncStateAfterAwait.tsx))

```jsx
const handleClick = () => {
  startTransition(async () => {
    await someAsyncOperation();
    setCount((prev) => prev + 1); // 💣 Loses transition context after await
  });
};
```

**Deferred Value Updates** ([SuspenseFallbackOnDeferredValue.tsx](src/SuspenseFallbackOnDeferredValue.tsx))

```jsx
const [count, setCount] = useState(0);
const deferredCount = useDeferredValue(count);
const handleClick = () => setCount((prev) => prev + 1); // 💣 Triggers fallback even when rendering deferred value
return (
  <>
    <p onClick={handleClick}>Counter: {deferredCount}</p>
    <ChildWithSuspense />
  </>
);
```

### ✅ What Doesn't Trigger Suspense Fallbacks

React's built-in optimizations prevent fallbacks when updates don't actually change state, and transitions effectively prevent fallbacks during hydration.

**Same-Value State Updates** ([NoSuspenseFallbackOnSameStateValue.tsx](src/NoSuspenseFallbackOnSameStateValue.tsx))

```jsx
const handleClick = () => setCount((prev) => prev); // ✅ React optimizes this away
```

**Same-Value Reducer Updates** ([NoSuspenseFallbackOnSameReducerValue.tsx](src/NoSuspenseFallbackOnSameReducerValue.tsx))

```jsx
const reducer = (state, action) => {
  case 'return_same': return state; // ✅ No actual change = no fallback
}
```

**Transition-Wrapped Updates** ([NoSuspenseFallbackOnTransitionUpdate.tsx](src/NoSuspenseFallbackOnTransitionUpdate.tsx))

```jsx
const handleClick = () => {
  startTransition(() => {
    setCount((prev) => prev + 1); // ✅ Prevents fallback during hydration
  });
};
```

**startTransition Direct Import Updates** ([NoSuspenseFallbackOnTransitionUpdate.tsx](src/NoSuspenseFallbackOnTransitionUpdate.tsx))

```jsx
import { startTransition } from "react";
const handleClick = () => {
  startTransition(() => {
    setCount((prev) => prev + 1); // ✅ Prevents fallback during hydration
  });
};
```

**Correctly Wrapped Async startTransition (Direct Import)** ([NoSuspenseFallbackOnCorrectlyWrappedAsyncTransition.tsx](src/NoSuspenseFallbackOnCorrectlyWrappedAsyncTransition.tsx))

```jsx
import { startTransition } from "react";

const handleClick = () => {
  startTransition(async () => {
    await someAsyncOperation();
    startTransition(() => {
      setCount((prev) => prev + 1); // ✅ Prevents fallback during hydration
    });
  });
};
```

**Deferred Value Updates with Memoization** ([NoSuspenseFallbackOnDeferredValueWithMemo.tsx](src/NoSuspenseFallbackOnDeferredValueWithMemo.tsx))

```jsx
const ChildWithSuspenseWithMemo = memo(ChildWithSuspense);
// ...
const [count, setCount] = useState(0);
const deferredCount = useDeferredValue(count);
const handleClick = () => setCount((prev) => prev + 1);
// ✅ Prevents fallback during hydration (☝️ requires React.memo)
return (
  <>
    <p onClick={handleClick}>Counter: {deferredCount}</p>
    <ChildWithSuspenseWithMemo />
  </>
);
```

**Deferred useIsSSR with Memoization** ([NoSuspenseFallbackOnDeferredExternalStoreMismatchWithMemo.tsx](src/NoSuspenseFallbackOnDeferredExternalStoreMismatchWithMemo.tsx))

```jsx
const ChildWithSuspenseWithMemo = memo(ChildWithSuspense);

const emptySubscribe = () => () => {};
const useIsSSR = () => {
  const isSSRSync = useSyncExternalStore(
    emptySubscribe,
    () => false, // client snapshot
    () => true, // server snapshot
  );
  return useDeferredValue(isSSRSync);
};

// ...
const isSSR = useIsSSR();
// ✅ Prevents fallback during hydration (☝️ requires React.memo)
return (
  <>
    <button>{isSSR ? "Server output" : "Client output"}</button>
    <ChildWithSuspenseWithMemo />
  </>
);
```

### ⚠️ Transition Edge Cases

While `startTransition` effectively prevents Suspense fallbacks during hydration, there are important exceptions that can catch developers off guard.

#### React's Async Context Limitation

Due to a JavaScript limitation, React loses the transition context after `await` operations. As documented in the [React docs](https://react.dev/reference/react/useTransition#react-doesnt-treat-my-state-update-after-await-as-a-transition), state updates after `await` are not automatically treated as transitions and will trigger Suspense fallbacks during hydration.

The React docs recommend wrapping post-`await` state updates in another `startTransition`, but the effectiveness depends on which `startTransition` you use:

```jsx
// ❌ Loses transition context after await
startTransition(async () => {
  await someAsyncFunction();
  setCount(1); // Triggers fallback during hydration
});

// ✅ Correctly wrapped with direct import - prevents fallback during hydration
import { startTransition } from "react";
startTransition(async () => {
  await someAsyncFunction();
  startTransition(() => {
    setCount(1); // Prevents fallback during hydration
  });
});

// 💣 Correctly wrapped with useTransition - still triggers fallback during hydration
const [, startTransition] = useTransition();
startTransition(async () => {
  await someAsyncFunction();
  startTransition(() => {
    setCount(1); // Still triggers fallback during hydration
  });
});
```

The nested `startTransition` pattern works during hydration only when using the direct import from React, not when using the `startTransition` from the `useTransition()` hook.

#### Rendering isPending State

Even when state changes are properly wrapped in transitions, rendering the `isPending` state can still trigger fallbacks during hydration.

**Rendering Transition Pending State** ([SuspenseFallbackOnIsPendingRender.tsx](src/SuspenseFallbackOnIsPendingRender.tsx))

```jsx
const [isPending, startTransition] = useTransition();
const handleClick = () => {
  startTransition(() => {
    setCount((prev) => prev + 1);
  });
};

return (
  <button>
    Counter: {count} {isPending && "(pending)"}{" "}
    {/* 💣 This triggers fallback */}
  </button>
);
```

The state change itself is properly wrapped in a transition, but **rendering the `isPending` state** causes additional renders that aren't transition-wrapped. This can trigger Suspense fallbacks during hydration, making it a subtle but important gotcha for developers who want to display pending states in their UI.

## 💭 Why This Happens

### The External Store Exception

External stores using `useSyncExternalStore` have a unique constraint: they **cannot benefit from transition optimizations**. As documented in the React docs, external store mutations cannot be marked as non-blocking transitions, making them always trigger Suspense fallbacks.
You can workaround that by combining `useSyncExternalStore` with `useDeferredValue` (and `useMemo`), as shown by [this article](https://kurtextrem.de/posts/react-uses-hydration).

### The useIsSSR Pattern (Server/Client Snapshot Mismatch)

The store doesn't even need to emit an update to break Suspense during hydration: when `getServerSnapshot` returns a different value than `getSnapshot`, React forces a **synchronous re-render right after hydration** - without any user interaction. This is the basis of the popular `useIsSSR` pattern described by [Jacob "kurtextrem" Groß](https://kurtextrem.de/posts/react-uses-hydration):

```jsx
const emptySubscribe = () => () => {};
const returnFalse = () => false;
const trueOnServerOrHydration = () => true;

function useIsSSR() {
  const isSSRSync = useSyncExternalStore(
    emptySubscribe,
    returnFalse,
    trueOnServerOrHydration,
  );
  return useDeferredValue(isSSRSync);
}
```

`useDeferredValue` makes the `true` → `false` switch itself happen at deferred priority (keeping the first client render consistent with the server HTML and time-slicing the update). **But that alone is not enough for Suspense**: as the article itself notes, `useSyncExternalStore` still forces a non-concurrent render pass, and if that pass re-renders a dehydrated Suspense boundary with a pending lazy child, the server-rendered content is discarded and the fallback appears ([test](src/SuspenseFallbackOnDeferredExternalStoreMismatch.tsx)).

The fix is the same as for plain `useDeferredValue`: wrap the Suspense subtree in `React.memo` (or use React Compiler) so the forced synchronous pass bails out before reaching the boundary, and only the deferred pass carries the new value ([test](src/NoSuspenseFallbackOnDeferredExternalStoreMismatchWithMemo.tsx)).

### The Async Context Limitation

React loses the transition context after `await` operations due to a JavaScript limitation. This means state updates after `await` behave like synchronous updates and will trigger Suspense fallbacks during hydration, even when the initial call was wrapped in `startTransition`.

This limitation will be resolved once [AsyncContext](https://github.com/tc39/proposal-async-context) becomes available, but for now the workaround is to wrap post-`await` state updates in another `startTransition`.

### How Transitions Work During Hydration

`startTransition` is effective during **both hydration and post-hydration phases**. During the hydration phase:

- Transitions successfully prevent Suspense fallbacks for synchronous state updates
- React can safely defer updates while maintaining consistency
- The exceptions are async state updates after `await` and rendering `isPending` state, which break the optimization

### React Compiler and Automatic Memoization

**🎉 React Compiler automatic memoization optimizations completely solves hydration Suspense issues**

Even without **any** `startTransition` wrapping React Compiler's automatic memoization prevents fallbacks in all cases!

Here you can see that the same [example](src/SuspenseFallbackOnStateChange.tsx) with react-compiler does **not** trigger the fallback:
![useState vs useState react-compiler](https://github.com/user-attachments/assets/629bf2d8-2cf7-49e2-b811-8f8c73dac2f6)

See for yourself directly in your browser: [default](https://jantimon.github.io/react-hydration-rules/SuspenseFallbackOnStateChange/index.html) vs [react-compiler](https://jantimon.github.io/react-hydration-rules/ReactCompilerStateChange/index.html)

## 🚀 Practical Implications

### For User Experience

- **Good**: Fast components don't wait for slow ones
- **Good**: React optimizes away unnecessary updates
- **Good**: Transitions prevent loading flashes during hydration
- **Challenge**: External stores can't benefit from transition optimizations
- **Gotcha**: Rendering `isPending` state can still trigger fallbacks

### For Performance

- **Selective Hydration**: Components hydrate independently
- **Priority-Based**: User interactions can reprioritize hydration
- **Optimization**: Same-value updates are completely skipped
- **Consistent Behavior**: Transitions work the same way throughout the app lifecycle

## 🛠️ Testing Approach

All behaviors are thoroughly tested using **E2E Playwright tests** with:

- **Real SSR**: Using `renderToPipeableStream` with Rspack build process
- **Client Hydration**: Actual hydration with `hydrateRoot`
- **Lazy Components**: Artificial delays to simulate real-world loading
- **Browser Testing**: Real browser interactions and timing

### Test Structure

```typescript
// 1. Build components with SSR
npm run build

// 2. Navigate to pre-rendered HTML
await page.goto(`file://${process.cwd()}/dist/${componentName}/index.html`);

// 3. Wait for hydration
await page.waitForLoadState('networkidle');

// 4. Trigger state change
await page.locator('button').first().click();

// 5. Verify Suspense behavior
const hasNoFallback = await page.locator('text=Suspense Boundary Content').isVisible();
expect(hasNoFallback).toBe(true);
```

## 🎯 Testing Suspense Behavior

1. **Build the project**: `npm run build`
2. **Open any example**: Navigate to `dist/[ExampleName]/index.html` in your browser
3. **Interact with the UI**: Click buttons to trigger state changes and observe Suspense behavior
4. **Observe the fallback**: Watch for "Suspense Boundary Fallback" vs "Suspense Boundary Content"

## 🔑 Key Takeaways

1. **Transitions effectively prevent Suspense fallbacks during hydration** - `startTransition` works as intended for synchronous updates (but React Compiler makes this manual approach unnecessary)
2. **The async context limitation is solved by React Compiler** - React loses transition context after `await`, but automatic memoization prevents the fallbacks regardless
3. **External stores are fixed by React Compiler** - while they cannot benefit from transitions, automatic memoization prevents their fallbacks
4. **React optimizes same-value updates** - built-in optimization prevents unnecessary fallbacks
5. **React Compiler fixes hydration issues** - no more manual `startTransition` wrapping needed to prevent server-rendered content discarding

## 🧪 Try It Yourself

[![Tests](https://github.com/jantimon/react-hydration-rules/actions/workflows/test.yml/badge.svg)](https://github.com/jantimon/react-hydration-rules/actions/workflows/test.yml)

Don't trust my word? Good - you shouldn't. Every behavior I've documented here comes from actual tests you can run yourself.

Just clone this repo and run `npm test` to see all these hydration quirks in action. The tests use real SSR with `renderToPipeableStream` and actual hydration with `hydrateRoot` in real browsers - no mocks or shortcuts.

I wrote these tests because I was debugging some gnarly hydration issues in production and found the relevant documentation scattered across different pages and sections. Turns out React's hydration behavior has some pretty specific rules that aren't immediately obvious from the main API docs.

---

## 🙏 Thanks

Big thanks to [@rickhanlonii](https://github.com/rickhanlonii) and [@gaearon](https://github.com/gaearon) for catching an important mistake in my original understanding
