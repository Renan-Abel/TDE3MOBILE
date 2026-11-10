import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { initialize } from "../data/repository";
export default function Layout() {
  return (
    <SQLiteProvider databaseName="sistema-vendas.db" onInit={initialize}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#123D32" },
          headerTintColor: "#fff",
          contentStyle: { backgroundColor: "#F6F5EF" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Sistema de Vendas" }} />
        <Stack.Screen name="clientes" options={{ title: "Clientes" }} />
        <Stack.Screen name="produtos" options={{ title: "Produtos" }} />
        <Stack.Screen name="compras" options={{ title: "Compras" }} />
      </Stack>
    </SQLiteProvider>
  );
}
