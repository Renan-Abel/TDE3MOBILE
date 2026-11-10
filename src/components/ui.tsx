import { useState, type ReactNode } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
export function Page({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={s.container}>
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.page}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Heading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={s.heading}>
      <Text style={s.title}>{title}</Text>
      <Text style={s.muted}>{subtitle}</Text>
    </View>
  );
}
export function Card({ children }: { children: ReactNode }) {
  return <View style={s.card}>{children}</View>;
}
export function Button({
  title,
  onPress,
  danger = false,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  danger?: boolean;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: danger
            ? "#FBECE9"
            : secondary
              ? "#EBF1EC"
              : "#21654F",
          opacity: disabled || pressed ? 0.55 : 1,
        },
      ]}
    >
      <Text
        style={{
          fontWeight: "700",
          color: danger ? "#9A302B" : secondary ? "#123D32" : "white",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        maxLength={maxLength}
        placeholder={placeholder}
        placeholderTextColor="#78877F"
      />
    </View>
  );
}
export function Notice({ text }: { text: string }) {
  return text ? (
    <Text accessibilityRole="alert" style={s.notice}>
      {text}
    </Text>
  ) : null;
}
export function Empty({ text }: { text: string }) {
  return (
    <Text style={[s.muted, { paddingVertical: 18, textAlign: "center" }]}>
      {text}
    </Text>
  );
}
export function Choice({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  options: {
    id: number;
    label: string;
  }[];
  value: number;
  onChange: (id: number) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visibleOptions = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <Button
        secondary
        disabled={disabled}
        title={options.find((o) => o.id === value)?.label ?? "Selecionar"}
        onPress={() => setOpen(!open)}
      />
      {open && !disabled && (
        <Card>
          <Field label="Buscar opção" value={query} onChangeText={setQuery} />
          {visibleOptions.map((o) => (
            <Button
              secondary
              key={o.id}
              title={o.label}
              onPress={() => {
                onChange(o.id);
                setOpen(false);
                setQuery("");
              }}
            />
          ))}
          {!visibleOptions.length && (
            <Empty
              text={
                options.length
                  ? "Nenhuma opção encontrada. Tente outro nome."
                  : "Ainda não há cadastros para escolher."
              }
            />
          )}
        </Card>
      )}
    </View>
  );
}
export function confirmDelete(
  action: () => void,
  message = "Esta ação não pode ser desfeita.",
) {
  Alert.alert("Excluir registro?", message, [
    { text: "Cancelar", style: "cancel" },
    { text: "Excluir", style: "destructive", onPress: action },
  ]);
}
export function errorMessage(e: unknown) {
  return e instanceof Error
    ? e.message
    : "Não foi possível concluir a operação.";
}
export const s = StyleSheet.create({
  container: { flex: 1 },
  heading: { gap: 8, marginTop: 12, marginBottom: 8 },
  field: { gap: 8 },
  page: {
    padding: 22,
    gap: 18,
    paddingBottom: 48,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  title: { fontSize: 30, lineHeight: 37, fontWeight: "700", color: "#123D32" },
  muted: { fontSize: 14, lineHeight: 21, color: "#62756B" },
  card: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#fff",
    gap: 12,
    borderWidth: 1,
    borderColor: "#E4E8DF",
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 14,
    minHeight: 50,
    justifyContent: "center",
  },
  label: { fontSize: 14, fontWeight: "600", color: "#294A3C" },
  input: {
    borderWidth: 1,
    borderColor: "#C9D7CC",
    borderRadius: 10,
    padding: 13,
    fontSize: 16,
    color: "#173D30",
    backgroundColor: "#FAFBF7",
    minHeight: 48,
  },
  notice: {
    padding: 14,
    backgroundColor: "#E6EDE2",
    borderRadius: 10,
    color: "#294A3C",
    lineHeight: 21,
  },
  name: { fontSize: 18, fontWeight: "700", color: "#173D30" },
  row: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  badge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4D7461",
    letterSpacing: 0.5,
  },
});
