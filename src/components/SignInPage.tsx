import React from "react";
import { ClerkProvider, SignIn, useUser } from "@clerk/clerk-react";
import { useEffect } from "react";

const SignInContent: React.FC = () => {
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    if (isSignedIn) {
      // Redirect to app after successful sign in
      window.location.href = "/app";
    }
  }, [isSignedIn]);

  if (isSignedIn) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-tertiary">Redirecting to your tasks...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <SignIn 
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "bg-surface border border-muted shadow-lg rounded-lg",
            headerTitle: "text-foreground",
            headerSubtitle: "text-tertiary",
            socialButtonsBlockButton: "bg-surface border border-muted text-foreground hover:bg-secondary",
            formButtonPrimary: "bg-primary hover:opacity-90",
            formFieldInput: "bg-surface border-muted text-foreground",
            identityPreviewEditButton: "text-primary",
            formFieldLabel: "text-foreground",
            dividerLine: "bg-muted",
            dividerText: "text-tertiary",
            footerActionLink: "text-primary",
          },
          variables: {
            colorPrimary: "#2563eb",
            colorBackground: "#ffffff",
            colorText: "#111827",
            borderRadius: "0.5rem",
          },
        }}
        redirectUrl="/app"
        signUpUrl="/signin"
      />
    </div>
  );
};

const SignInPage: React.FC = () => {
  return (
    <ClerkProvider publishableKey={import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <SignInContent />
    </ClerkProvider>
  );
};

export default SignInPage;