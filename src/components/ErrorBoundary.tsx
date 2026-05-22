import { FONTS, SPACING, ThemeColors } from "@/src/constants/Theme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  colors: ThemeColors;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Chat error boundary caught:", error, errorInfo);
  }

  render() {
    const { hasError, message } = this.state;
    const { colors, children } = this.props;

    if (!hasError) {
      return children;
    }

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.onBackground }]}>
          Something went wrong.
        </Text>
        <Text style={[styles.details, { color: colors.onSurfaceVariant }]}>
          {message}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.headline,
    fontSize: 20,
    marginBottom: SPACING.sm,
  },
  details: {
    fontFamily: FONTS.body,
    fontSize: 14,
    textAlign: "center",
  },
});
