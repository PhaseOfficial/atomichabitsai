import { FONTS, ROUNDNESS, SPACING, ThemeColors } from "@/src/constants/Theme";
import React, { useCallback } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const suggestions = [
  "Audit my habits",
  "Suggest a 2-min version",
  "Log my workout",
  "Help me build a morning routine",
] as const;

interface SuggestionChipsProps {
  colors: ThemeColors;
  onSuggestionPress: (message: string) => void;
  disabled?: boolean;
}

const SuggestionChips = ({
  colors,
  onSuggestionPress,
  disabled = false,
}: SuggestionChipsProps) => {
  const styles = createStyles(colors);

  const renderSuggestion = useCallback(
    ({ item }: { item: string }) => (
      <TouchableOpacity
        style={[styles.suggestionButton, disabled && { opacity: 0.5 }]}
        onPress={() => !disabled && onSuggestionPress(item)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Send suggestion: ${item}`}
      >
        <Text style={styles.suggestionText}>{item}</Text>
      </TouchableOpacity>
    ),
    [onSuggestionPress, styles, disabled],
  );

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        data={suggestions}
        keyExtractor={(item) => item}
        renderItem={renderSuggestion}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.suggestionSpacer} />}
      />
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      paddingVertical: SPACING.md,
    },
    content: {
      paddingHorizontal: SPACING.lg,
    },
    suggestionSpacer: {
      width: SPACING.sm,
    },
    suggestionButton: {
      backgroundColor: colors.surfaceVariant + "80",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: ROUNDNESS.md,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
    },
    suggestionText: {
      fontFamily: FONTS.labelSm,
      fontSize: 11,
      color: colors.onSurface,
    },
  });

export default React.memo(SuggestionChips);
