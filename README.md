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

**Update**: react-compiler seems completely to prevent ALL Suspense fallbacks during hydration

**Need the full details?** Just read on

```mermaid
flowchart TD
    A[User Interaction] --> B{App Hydrated?}

    B -->|No - During Hydration| C{State Update?}
    B -->|Yes - Post Hydration| D{State Update?}

    C -->|No Change| E[✅ No Fallback]
    C -->|Same Value| F{React Optimization}
    C -->|New Value| G{External Store?}

    F -->|useState/useReducer| E
    F -->|External Store| H[💣 Suspense Fallback]

    G -->|Yes - useSyncExternalStore| H[💣 Always Triggers]
    G -->|No| I{Wrapped in Transition?}

    I -->|No| H[💣 Suspense Fallback]
    I -->|Yes| J{Async Operation?}

    J -->|No - Sync| K{Rendering isPending?}
    J -->|Yes - Async| L{When is State Update?}

    K -->|Yes| H[💣 Suspense Fallback]
    K -->|No| E[✅ No Fallback]

    L -->|Pre-await| E[✅ No Fallback]
    L -->|Post-await| M{Correctly Wrapped?}

    M -->|No - Lost Context| H[💣 Suspense Fallback]
    M -->|Yes| N{Which startTransition?}

    N -->|Direct Import| O{Rendering isPending?}
    N -->|useTransition Hook| H[💣 Still Triggers]

    O -->|Yes| H[💣 Suspense Fallback]
    O -->|No| E[✅ No Fallback]

    D -->|No Change| E
    D -->|Same Value| E
    D -->|New Value| P{External Store?}

    P -->|Yes| Q[💣 Always Triggers]
    P -->|No| R{Wrapped in Transition?}

    R -->|Yes| S[⚡ Prevents Fallback]
    R -->|No| T[💣 May Trigger Fallback]
```

## 📊 Behavior Matrix Overview

| Update Type                                                    | Behavior                  | React Compiler            | Notes                                                                                                                                                                                                                                        | Source Code                                                                                                              |
| -------------------------------------------------------------- | ------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `useState`<br>(**new** value)                                  | 💣 **Triggers fallback**  | ✅ **Prevents fallbacks** | Without transition wrapper causes Suspense fallback, but React Compiler's automatic memoization prevents it ([React team guidance](https://github.com/facebook/react/issues/24476#issuecomment-1127800350))                                  | [code](src/SuspenseFallbackOnStateChange.tsx)                                               |
| `useState`<br>(**same** value)                                 | ✅ **Never triggers**     |                        | React's built-in optimization prevents fallback                                                                                                                                                                                              | [code](src/NoSuspenseFallbackOnSameStateValue.tsx)                                     |
| `useReducer`<br>(**new** value)                                | 💣 **Triggers fallback**  | ✅ **Prevents fallbacks** | Without transition wrapper causes Suspense fallback, but React Compiler's automatic memoization prevents it ([React team guidance](https://github.com/facebook/react/issues/24476#issuecomment-1127800350))                                  | [code](src/SuspenseFallbackOnReducerChange.tsx)                                           |
| `useReducer`<br>(**same** value)                               | ✅ **Never triggers**     |                        | React's built-in optimization prevents fallback                                                                                                                                                                                              | [code](src/NoSuspenseFallbackOnSameReducerValue.tsx)                                 |
| `startTransition`<br>(sync - direct import)                    | ✅ **Prevents fallbacks** |                        | Direct import of startTransition works effectively during hydration                                                                                                                                                                          | [code](src/NoSuspenseFallbackOnTransitionUpdate.tsx)                                 |
| `useTransition`<br>(sync - hook)                               | 💣 **Triggers fallback**  | ✅ **Prevents fallbacks** | useTransition hook triggers fallbacks during hydration, but React Compiler's automatic memoization prevents it                                                                                                                               | [code](src/SuspenseFallbackOnUseTransitionUpdate.tsx)                               |
| `startTransition`<br>(async - post-await)                      | 💣 **Triggers fallback**  | ✅ **Prevents fallbacks** | React loses transition context after await, but React Compiler's automatic memoization prevents fallbacks ([See React docs](https://react.dev/reference/react/useTransition#react-doesnt-treat-my-state-update-after-await-as-a-transition)) | [code](src/SuspenseFallbackOnAsyncStateAfterAwait.tsx)                             |
| `startTransition`<br>(correctly wrapped async - direct import) | ✅ **Prevents fallbacks** |                        | Nested startTransition from direct import preserves context during hydration                                                                                                                                                                 | [code](src/NoSuspenseFallbackOnCorrectlyWrappedAsyncTransition.tsx)   |
| `startTransition`<br>(correctly wrapped async - useTransition) | 💣 **Still triggers**     | ✅ **Prevents fallbacks** | Nested startTransition from useTransition hook triggers fallbacks during hydration, but React Compiler's automatic memoization prevents it                                                                                                   | [code](src/SuspenseFallbackOnCorrectlyWrappedAsyncUseTransition.tsx) |
| `startTransition` + `isPending` render                         | 💣 **Still triggers**     | ✅ **Prevents fallbacks** | Rendering isPending state breaks transition optimization, but React Compiler's automatic memoization prevents fallbacks                                                                                                                      | [code](src/SuspenseFallbackOnIsPendingRender.tsx)                                       |
| `useDeferredValue`                                             | 💣 **Triggers fallback**  | ✅ **Prevents fallbacks** | Deferred values trigger fallbacks during hydration, but React Compiler's automatic memoization prevents it                                                                                                                                   | [code](src/SuspenseFallbackOnDeferredValue.tsx)                                           |
| `useDeferredValue` + `React.memo`                              | ✅ **Prevents fallbacks** |                        | Memoized components prevent re-renders during deferred updates ([See React docs pitfall](https://react.dev/reference/react/useDeferredValue#pitfall))                                                                                        | [code](src/NoSuspenseFallbackOnDeferredValueWithMemo.tsx)                       |
| `useSyncExternalStore`                                         | 💣 **Always triggers**    | ✅ **Prevents fallbacks** | Cannot benefit from transitions at any phase, but React Compiler's automatic memoization still prevents fallbacks ([See docs](https://react.dev/reference/react/useSyncExternalStore#caveats))                                               | [code](src/SuspenseFallbackOnExternalStore.tsx)                                           |

### 💣 What Triggers Suspense Fallbacks

Even if the server includes the full HTML for a **lazy** component, certain patterns during hydration will still trigger Suspense fallbacks and remove the existing content

![useTransition vs startTransition](https://github.com/user-attachments/assets/b6d10cd0-71aa-425f-aedf-55942de2b353)

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

1. **🎉 React Compiler is the ultimate solution** - automatic memoization completely prevents ALL Suspense fallbacks during hydration, including previously unsolvable cases like `useSyncExternalStore` and `isPending` rendering
2. **Transitions effectively prevent Suspense fallbacks during hydration** - `startTransition` works as intended for synchronous updates (but React Compiler makes this manual approach unnecessary)
3. **The async context limitation is solved by React Compiler** - React loses transition context after `await`, but automatic memoization prevents the fallbacks regardless
4. **External stores are fixed by React Compiler** - while they cannot benefit from transitions, automatic memoization prevents their fallbacks
5. **React optimizes same-value updates** - built-in optimization prevents unnecessary fallbacks
6. **React Compiler fixes hydration issues** - no more manual `startTransition` wrapping needed to prevent server-rendered content discarding

## 🧪 Try It Yourself

[![Tests](https://github.com/jantimon/react-hydration-rules/actions/workflows/test.yml/badge.svg)](https://github.com/jantimon/react-hydration-rules/actions/workflows/test.yml)

Don't trust my word? Good - you shouldn't. Every behavior I've documented here comes from actual tests you can run yourself.

Just clone this repo and run `npm test` to see all these hydration quirks in action. The tests use real SSR with `renderToPipeableStream` and actual hydration with `hydrateRoot` in real browsers - no mocks or shortcuts.

I wrote these tests because I was debugging some gnarly hydration issues in production and couldn't find clear documentation anywhere. Turns out React's hydration behavior has some pretty specific rules that aren't obvious until you hit them.

---

## 🙏 Thanks

Big thanks to [@rickhanlonii](https://github.com/rickhanlonii) and [@gaearon](https://github.com/gaearon) for catching an important mistake in my original understanding
