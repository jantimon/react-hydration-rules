import React, { useEffect, useState } from "react";

export const LazyChild = () => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);
  return (
    <div data-testid="lazy-child">
      Hello from lazy component! {isHydrated ? "[Hydrated]" : "[Not Hydrated]"}
    </div>
  );
};
