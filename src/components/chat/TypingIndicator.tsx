import { FONTS, ROUNDNESS, ThemeColors } from "@/src/constants/Theme";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

interface TypingIndicatorProps {
  colors: ThemeColors;
}

const TypingIndicator = ({ colors }: TypingIndicatorProps) => {
  const [dots, setDots] = useState(1);
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((value) => (value % 3) + 1);
    }, 420);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.wrapper} accessibilityRole="text">
      <Text
        style={styles.text}
      >{`Architecting response${".".repeat(dots)}`}</Text>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.surface,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: ROUNDNESS.lg,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "4D",
    },
    text: {
      fontFamily: FONTS.body,
      fontSize: 15,
      lineHeight: 22,
      color: colors.onSurface,
    },
  });

export default React.memo(TypingIndicator);
