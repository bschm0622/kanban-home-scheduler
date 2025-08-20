import React from "react";
import { CONVEX_URL } from "astro:env/client";
import type { FC } from "react";
import { ConvexReactClient } from "convex/react";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Authenticated, Unauthenticated } from "convex/react";
import KanbanBoard from "./KanbanBoard";

const client = new ConvexReactClient(CONVEX_URL);

const AuthContent: FC = () => {
  return (
    <>
      <Authenticated>
        <KanbanBoard />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-tertiary mb-4">Checking authentication...</p>
            <button
              onClick={() => window.location.href = "/signin"}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </Unauthenticated>
    </>
  );
};

const ConvexApp: FC = () => {
  return (
    <ClerkProvider 
      publishableKey={import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY}
      proxyUrl="/clerk"
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: "#2563eb",
          colorBackground: "#ffffff",
          colorText: "#111827",
        },
      }}
    >
      <ConvexProviderWithClerk client={client} useAuth={useAuth}>
        <AuthContent />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
};

export default ConvexApp;