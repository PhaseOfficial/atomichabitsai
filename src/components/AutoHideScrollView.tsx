import { useAutoHideOnScroll } from "@/src/hooks/useAutoHideTabBar";
import React from "react";
import { ScrollView, ScrollViewProps } from "react-native";

const AutoHideScrollView = React.forwardRef<ScrollView, ScrollViewProps>(
  (props, ref) => {
    const { onScroll, scrollEventThrottle } = useAutoHideOnScroll();

    return (
      <ScrollView
        ref={ref}
        {...props}
        scrollEventThrottle={scrollEventThrottle}
        onScroll={(event) => {
          onScroll(event);
          if (props.onScroll) {
            props.onScroll(event);
          }
        }}
      />
    );
  },
);

export default AutoHideScrollView;
