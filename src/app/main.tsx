/*
 * Application entry point
 * ---------------------------------------------------------------------------
 * Global style load order: tokens (raw values) → the 6 primitives → shell/nav/
 * screen layouts. Every component thereafter references token classes only,
 * never raw values (zero hardcoding).
 * ---------------------------------------------------------------------------
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

// Design tokens + shared primitives (6 kinds) — output of grain-1/2
import "../styles/tokens.css";
import "../styles/components/index.css";

// Reference screen (problem solving = chat) component styles — conversation, message-bubble, composer
import "../styles/chat.css";

// This grain: shell, nav, and flow screen layouts (tokens only)
import "./styles/app-shell.css";
import "./styles/navigation.css";
import "./styles/screens.css";

// Layouts for the flow screens with staged presentation (two-pane identity verification, two-phase solving)
import "./styles/flow-screens.css";

// Welcome intro (full-bleed hero ahead of the flow) — an independent layer used outside the shell, so it loads last
import "./styles/welcome.css";

import { router } from "./router";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element (#root) was not found.");
}

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
