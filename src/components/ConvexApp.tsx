import React, { useEffect } from "react";
import { CONVEX_URL } from "astro:env/client";
import type { FC } from "react";
import { ConvexReactClient } from "convex/react";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Authenticated } from "convex/react";
import KanbanBoard from "./KanbanBoard";

const client = new ConvexReactClient(CONVEX_URL);

const AuthContent: FC = () => {
  const { isSignedIn, isLoaded } = useAuth();

  // Redirect to signin if not authenticated after auth is loaded
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      // Small delay to prevent immediate redirect on initial load
      const timer = setTimeout(() => {
        window.location.href = "/signin";
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, isSignedIn]);

  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-tertiary">Loading...</p>
        </div>
      </div>
    );
  }

  // Show redirect message if not signed in
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-tertiary mb-4">Redirecting to sign in...</p>
          <button
            onClick={() => window.location.href = "/signin"}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Go to Sign In Now
          </button>
        </div>
      </div>
    );
  }

  // User is authenticated, show the app
  return (
    <Authenticated>
      <KanbanBoard />
    </Authenticated>
  );
};

const ConvexApp: FC = () => {
  return (
    <ClerkProvider 
      publishableKey={import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY}
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