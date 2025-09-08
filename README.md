# React Hydration and Suspense: The Complete Behavior Guide

Ever wonder why your perfectly server-rendered content suddenly flashes to a loading spinner when users click something? You're not alone. React's hydration phase has some counterintuitive rules that can catch even experienced developers off guard.

I spent way too much time debugging these behaviors in production, so I built this test suite to document exactly when and why Suspense fallbacks trigger during hydration. Some of the patterns might surprise you.

## 🎯 The Hydration Challenge

When React hydrates a server-rendered application, it faces a fundamental challenge: maintaining UI consistency while making components interactive. Modern React (since v18) introduced **selective hydration** and **concurrent rendering** to solve this, but these features come with nuanced behaviors that can catch developers off guard.

### Key Insight: State Changes Always Overrule During Hydration

> [!CAUTION]
The most important finding: **any state change during hydration will trigger Suspense fallbacks**, regardless of how you wrap or optimize the update. This behavior prioritizes consistency over smooth UX during the critical hydration phase.

### 💣 What Triggers Suspense Fallbacks

Even if the server includes the full HTML for a **lazy** component, any state change during hydration will trigger Suspense fallbacks and therefore remove the existing content.

**Regular State Updates** ([test](src/tests/SuspenseTriggerOnStateChangeComponent.test.tsx))

```jsx
const [count, setCount] = useState(0);
const handleClick = () => setCount((prev) => prev + 1); // 💣 Triggers fallback
```

**Reducer Updates** ([test](src/tests/SuspenseTriggerOnReducerChangeComponent.test.tsx))

```jsx
const [state, dispatch] = useReducer(reducer, initialState);
const handleClick = () => dispatch({ type: "increment" }); // 💣 Triggers fallback
```

**External Store Changes** ([test](src/tests/SuspenseTriggerOnExternalStoreComponent.test.tsx))

```jsx
const value = useSyncExternalStore(subscribe, getSnapshot);
// Any external store mutation 💣 Always triggers fallback
```

**Transition-Wrapped Updates (Sync)** ([test](src/tests/SuspenseTriggerOnTransitionUpdateComponent.test.tsx))

```jsx
const [isPending, startTransition] = useTransition();
const handleClick = () => {
  startTransition(() => {
    setCount((prev) => prev + 1); // 💣 Still triggers fallback during hydration
  });
};
```

**Transition-Wrapped Updates (Async)** ([test](src/tests/SuspenseTriggerOnAsyncTransitionUpdateComponent.test.tsx))

```jsx
const handleClick = () => {
  startTransition(async () => {
    setCount((prev) => prev + 1); // 💣 Still triggers fallback during hydration
  });
};
```

### ✅ What Doesn't Trigger Suspense Fallbacks

React's built-in optimizations prevent fallbacks when updates don't actually change state.

**Same-Value State Updates** ([test](src/tests/NoSuspenseOnSameStateValueComponent.test.tsx))

```jsx
const handleClick = () => setCount((prev) => prev); // ✅ React optimizes this away
```

**Same-Value Reducer Updates** ([test](src/tests/NoSuspenseOnSameReducerValueComponent.test.tsx))

```jsx
const reducer = (state, action) => {
  case 'return_same': return state; // ✅ No actual change = no fallback
}
```

## 💭 Why This Happens

### React's Hydration Priority System

During hydration, React must ensure the client-side component tree matches what was rendered on the server. When state changes occur:

1. **Consistency First**: React re-evaluates the entire component tree
2. **Lazy Components**: If lazy components are still loading, fallbacks must show
3. **No Exceptions**: Even transitions can't override this safety mechanism

### The External Store Exception

External stores using `useSyncExternalStore` have a unique constraint: they **cannot benefit from transition optimizations**. As documented in the React docs, external store mutations cannot be marked as non-blocking transitions, making them always trigger Suspense fallbacks.

### Why Transitions Don't Help During Hydration

`startTransition` is designed for **post-hydration navigation and updates**. During the hydration phase:

- Lazy components are still in an indeterminate state
- React cannot safely defer updates without breaking consistency
- Both sync and async transitions behave identically

## 📊 Complete Behavior Matrix

### During Hydration Phase

| Update Type                   | Behavior               | Notes                                           |
| ----------------------------- | ---------------------- | ----------------------------------------------- |
| `useState` (**new** value)    | 💣 **Always triggers** | Any actual value change causes fallback         |
| `useState` (**same** value)   | ✅ **Never triggers**  | React's built-in optimization prevents fallback |
| `useReducer` (**new** value)  | 💣 **Always triggers** | Any actual state change causes fallback         |
| `useReducer` (**same** value) | ✅ **Never triggers**  | React's built-in optimization prevents fallback |
| `startTransition` (sync)      | 💣 **Still triggers**  | Transitions have no effect during hydration     |
| `startTransition` (async)     | 💣 **Still triggers**  | Identical behavior to sync during hydration     |
| `useSyncExternalStore`        | 💣 **Always triggers** | Cannot be optimized away during hydration       |

### Post-Hydration Phase

| Update Type                   | Behavior                  | Notes                                             |
| ----------------------------- | ------------------------- | ------------------------------------------------- |
| `useState` (**new** value)    | ⚡ **Can be optimized**   | Transitions prevent fallbacks for state updates   |
| `useState` (**same** value)   | ✅ **Never triggers**     | React's built-in optimization still applies       |
| `useReducer` (**new** value)  | ⚡ **Can be optimized**   | Transitions prevent fallbacks for reducer updates |
| `useReducer` (**same** value) | ✅ **Never triggers**     | React's built-in optimization still applies       |
| `startTransition` (sync)      | ✅ **Prevents fallbacks** | Transitions work as expected post-hydration       |
| `startTransition` (async)     | ✅ **Prevents fallbacks** | Full transition API available                     |
| `useSyncExternalStore`        | 💣 **Always triggers**    | Cannot benefit from transitions at any phase      |

## 🎭 The Two Phases of React Apps

Understanding React's behavior requires thinking in two distinct phases:

### Phase 1: Hydration (Strict Rules)

- **Goal**: Achieve consistency between server and client
- **Behavior**: Any state change triggers fallbacks
- **Optimization**: Limited to same-value updates only
- **Duration**: Until all components are hydrated

### Phase 2: Post-Hydration (Flexible UX)

- **Goal**: Smooth user experience
- **Behavior**: Transitions prevent jarring fallbacks
- **Optimization**: Full transition API available
- **Duration**: The rest of the app's lifecycle

## 🚀 Practical Implications

### For User Experience

- **Good**: Fast components don't wait for slow ones
- **Good**: React optimizes away unnecessary updates
- **Challenge**: State updates during hydration create loading flashes
- **Challenge**: External stores can't benefit from transition optimizations

### For Performance

- **Selective Hydration**: Components hydrate independently
- **Priority-Based**: User interactions can reprioritize hydration
- **Optimization**: Same-value updates are completely skipped
- **Trade-off**: Consistency during hydration vs. smooth UX

## 🛠️ Testing Approach

These findings are based on comprehensive testing using:

- **Server-Side Rendering**: Real SSR with `renderToPipeableStream`
- **Client Hydration**: Actual hydration with `hydrateRoot`
- **Lazy Components**: Artificial delays to simulate real-world loading
- **Semantic Testing**: Following Testing Library best practices

### Test Structure

```typescript
// 1. Render on server
await renderAndHydrate(<Component />);

// 2. Wait for hydration
await waitFor(() => screen.getByRole("button"));

// 3. Trigger state change
fireEvent.click(screen.getByRole("button"));

// 4. Verify Suspense behavior
expect(screen.findByText("Suspended")).resolves.toBeInTheDocument();
```

## 🔑 Key Takeaways

1. **State changes during hydration always trigger Suspense fallbacks** - no exceptions
2. **Transitions are designed for post-hydration UX** - they don't prevent hydration fallbacks
3. **External stores have inherent limitations** - they cannot benefit from transition optimizations
4. **React optimizes same-value updates** - the only way to avoid fallbacks during hydration
5. **Hydration is a special phase** - different rules apply compared to normal app operation

## 🧪 Try It Yourself

[![Tests](https://github.com/jantimon/react-hydration-rules/actions/workflows/test.yml/badge.svg)](https://github.com/jantimon/react-hydration-rules/actions/workflows/test.yml)

Don't trust my word? Good - you shouldn't. Every behavior I've documented here comes from actual tests you can run yourself.

Just clone this repo and run `npm test` to see all these hydration quirks in action. The tests use real SSR with `renderToPipeableStream` and actual hydration with `hydrateRoot` - no mocks or shortcuts.

I wrote these tests because I was debugging some gnarly hydration issues in production and couldn't find clear documentation anywhere. Turns out React's hydration behavior has some pretty specific rules that aren't obvious until you hit them.

---

_Understanding these patterns helps developers make informed decisions about when to use transitions, how to handle external stores, and what UX trade-offs exist during the critical hydration phase._
