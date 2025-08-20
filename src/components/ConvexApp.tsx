import React from "react";
import { CONVEX_URL } from "astro:env/client";
import type { FC } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import KanbanBoard from "./KanbanBoard";

const client = new ConvexReactClient(CONVEX_URL);

const ConvexApp: FC = () => {
  return (
    <ConvexProvider client={client}>
      <KanbanBoard />
    </ConvexProvider>
  );
};

export default ConvexApp;