import React from "react";
import ReactDOM from "react-dom/client";
import {
  MantineProvider,
  createTheme,
  localStorageColorSchemeManager
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./styles.css";

const theme = createTheme({
  primaryColor: "cyan",
  defaultRadius: "md",
  fontFamily: "Space Grotesk, ui-sans-serif, system-ui",
  headings: {
    fontFamily: "Space Grotesk, ui-sans-serif, system-ui",
    fontWeight: "700"
  }
});

const queryClient = new QueryClient();
const colorSchemeManager = localStorageColorSchemeManager({
  key: "todo-flow-color-scheme"
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider
        theme={theme}
        defaultColorScheme="auto"
        colorSchemeManager={colorSchemeManager}
      >
        <Notifications position="top-right" />
        <App />
      </MantineProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
