import { Text } from "@/components/ui/text";
import { useAppearance } from "@/hooks/use-appearance";
import { useTheme } from "@/hooks/use-theme";
import { ChevronDown, Search, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export type QuerySelectOption<TMeta = unknown> = {
  label: string;
  value: string;
  subtitle?: string;
  meta?: TMeta;
};

type QuerySelectProps = {
  label?: string;
  placeholder: string;
  value?: string;
  onChange: (value: string | undefined, option?: QuerySelectOption) => void;
  options: QuerySelectOption[];
  error?: string;
  loading?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  emptyMessage?: string;
  noResultsMessage?: string;
};

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 180;
const PANEL_HEIGHT_FRACTION = 0.3;

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function QuerySelect({
  label,
  placeholder,
  value,
  onChange,
  options,
  error,
  loading = false,
  disabled = false,
  clearable = false,
  emptyMessage = "Nenhuma opção disponível.",
  noResultsMessage = "Nenhum resultado encontrado.",
}: QuerySelectProps) {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const { iconColor, iconColorSecondary } = useAppearance();
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loadedCount, setLoadedCount] = useState(PAGE_SIZE);

  const panelHeight = Math.round(windowHeight * PANEL_HEIGHT_FRACTION);

  useEffect(() => {
    if (searchQuery === debouncedQuery) return;
    const handle = setTimeout(
      () => setDebouncedQuery(searchQuery),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(handle);
  }, [searchQuery, debouncedQuery]);

  useEffect(() => {
    setLoadedCount(PAGE_SIZE);
  }, [debouncedQuery]);

  useEffect(() => {
    if (visible) setLoadedCount(PAGE_SIZE);
  }, [visible]);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const query = normalize(debouncedQuery.trim());
    if (!query) return options;
    return options.filter((option) => {
      if (normalize(option.label).includes(query)) return true;
      if (option.subtitle && normalize(option.subtitle).includes(query)) {
        return true;
      }
      return false;
    });
  }, [options, debouncedQuery]);

  const displayedOptions = useMemo(
    () => filteredOptions.slice(0, loadedCount),
    [filteredOptions, loadedCount],
  );

  const hasMore = loadedCount < filteredOptions.length;

  const loadMore = useCallback(() => {
    setLoadedCount((c) => {
      if (c >= filteredOptions.length) return c;
      return Math.min(c + PAGE_SIZE, filteredOptions.length);
    });
  }, [filteredOptions.length]);

  const handleOpen = () => {
    if (disabled || loading) return;
    setVisible(true);
  };

  const handleClose = () => {
    setVisible(false);
    setSearchQuery("");
    setDebouncedQuery("");
  };

  const handleSelect = (option: QuerySelectOption) => {
    onChange(option.value, option);
    handleClose();
  };

  const handleClear = () => {
    onChange(undefined);
  };

  const targetLabel = (label || placeholder).toLowerCase();

  return (
    <View className="gap-2">
      {label ? (
        <Text className="text-sm font-medium text-card-foreground">
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={handleOpen}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={`Selecionar ${targetLabel}`}
        className={`flex-row items-center justify-between rounded-2xl border px-4 py-3.5 ${
          error
            ? "border-destructive bg-destructive/5"
            : "border-border bg-card"
        } ${disabled || loading ? "opacity-60" : ""}`}
      >
        <Text
          className={`flex-1 pr-2 text-base ${
            selectedOption ? "text-card-foreground" : "text-muted-foreground"
          }`}
          numberOfLines={1}
        >
          {selectedOption?.label ?? placeholder}
        </Text>

        <View className="flex-row items-center gap-2">
          {loading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : null}
          {clearable && selectedOption && !disabled ? (
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                handleClear();
              }}
              accessibilityRole="button"
              accessibilityLabel="Limpar seleção"
              className="h-7 w-7 items-center justify-center rounded-full bg-muted"
            >
              <X size={14} color={iconColorSecondary} strokeWidth={2.5} />
            </Pressable>
          ) : null}
          <ChevronDown size={18} color={iconColorSecondary} strokeWidth={2} />
        </View>
      </Pressable>

      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <SafeAreaProvider>
          <View className="flex-1 bg-black/50">
            <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
              >
                <TouchableWithoutFeedback onPress={handleClose}>
                  <View className="flex-1 justify-center px-4 ">
                    <TouchableWithoutFeedback>
                      <View
                        style={{ height: panelHeight }}
                        className="flex-col overflow-hidden rounded-3xl bg-card"
                      >
                        <View className="flex-row items-center justify-between px-4 py-3">
                          <Text
                            className="flex-1 pr-2 text-base font-semibold text-card-foreground"
                            numberOfLines={1}
                          >
                            {label ?? placeholder}
                          </Text>
                          <Pressable
                            onPress={handleClose}
                            accessibilityRole="button"
                            accessibilityLabel="Fechar seleção"
                            className="h-8 w-8 items-center justify-center rounded-full bg-muted"
                          >
                            <X size={16} color={iconColor} strokeWidth={2.5} />
                          </Pressable>
                        </View>

                        <View className="px-3 py-2">
                          <View className="flex-row items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
                            <Search
                              size={18}
                              color={iconColorSecondary}
                              strokeWidth={2}
                            />
                            <TextInput
                              value={searchQuery}
                              onChangeText={setSearchQuery}
                              placeholder="Buscar..."
                              placeholderTextColor={theme.mutedForeground}
                              autoCapitalize="none"
                              autoCorrect={false}
                              className="flex-1 text-base text-card-foreground py-2"
                              style={{
                                color: theme.cardForeground,
                                paddingVertical: Platform.OS === "ios" ? 2 : 0,
                              }}
                            />
                          </View>
                        </View>

                        {filteredOptions.length === 0 ? (
                          <View className="flex-1 items-center justify-center px-4 py-6">
                            <Text className="text-center text-sm text-muted-foreground">
                              {debouncedQuery ? noResultsMessage : emptyMessage}
                            </Text>
                          </View>
                        ) : (
                          <View className="min-h-0 flex-1">
                            <FlatList
                              style={{ flex: 1 }}
                              data={displayedOptions}
                              keyExtractor={(item) => item.value}
                              keyboardShouldPersistTaps="handled"
                              initialNumToRender={PAGE_SIZE}
                              maxToRenderPerBatch={PAGE_SIZE}
                              windowSize={5}
                              removeClippedSubviews
                              showsVerticalScrollIndicator
                              onEndReached={loadMore}
                              onEndReachedThreshold={0.35}
                              ListFooterComponent={
                                hasMore ? (
                                  <View className="py-3">
                                    <ActivityIndicator
                                      size="small"
                                      color={theme.primary}
                                    />
                                  </View>
                                ) : (
                                  <View className="h-2" />
                                )
                              }
                              renderItem={({ item }) => (
                                <Pressable
                                  onPress={() => handleSelect(item)}
                                  className={`px-4 py-3 ${
                                    item.value === value ? "bg-primary/10" : ""
                                  }`}
                                >
                                  <Text className="text-base font-medium text-card-foreground">
                                    {item.label}
                                  </Text>
                                  {item.subtitle ? (
                                    <Text className="mt-0.5 text-sm text-muted-foreground">
                                      {item.subtitle}
                                    </Text>
                                  ) : null}
                                </Pressable>
                              )}
                            />
                          </View>
                        )}
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </TouchableWithoutFeedback>
              </KeyboardAvoidingView>
            </SafeAreaView>
          </View>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}
