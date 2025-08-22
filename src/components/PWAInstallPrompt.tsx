import { useState, useEffect } from "react";

interface PWAInstallPromptProps {
  onDismiss?: () => void;
}

export default function PWAInstallPrompt({ onDismiss }: PWAInstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if we should show the install prompt
    const shouldShow = checkShouldShowPrompt();
    if (!shouldShow) return;

    let eventFired = false;

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      eventFired = true;
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show our custom prompt after a short delay
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Fallback: if no beforeinstallprompt event fires within 3 seconds, 
    // show manual instructions for mobile browsers
    const fallbackTimer = setTimeout(() => {
      if (!eventFired && shouldShow) {
        // Show for mobile Safari and other mobile browsers
        const isMobileSafari = /iPhone|iPad|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent);
        const isMobileChrome = /Android/.test(navigator.userAgent) && /Chrome/.test(navigator.userAgent);
        
        if (isMobileSafari || isMobileChrome) {
          setTimeout(() => setShowPrompt(true), 2000);
        }
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const checkShouldShowPrompt = (): boolean => {
    // Only show on mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) {
      return false;
    }

    // Don't show if already running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return false;
    }

    // Don't show on iOS if already installed
    if ((window.navigator as any).standalone === true) {
      return false;
    }

    // Don't show if user previously dismissed (within last 7 days)
    const dismissedTime = localStorage.getItem('pwa-install-dismissed');
    if (dismissedTime) {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      if (parseInt(dismissedTime) > sevenDaysAgo) {
        return false;
      }
    }

    // Don't show if user has visited less than 3 times
    const visitCount = parseInt(localStorage.getItem('app-visit-count') || '0');
    if (visitCount < 3) {
      return false;
    }

    return true;
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Show manual instructions based on browser
      showManualInstructions();
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      // Track successful install
      localStorage.setItem('pwa-installed', 'true');
    } else {
      console.log('User dismissed the install prompt');
      // Track dismissal
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    }
    
    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowPrompt(false);
    onDismiss?.();
  };

  const handleDismiss = () => {
    // Track dismissal with timestamp
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setShowPrompt(false);
    onDismiss?.();
  };

  const showManualInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    let instructions = '';
    
    if (isIOS) {
      instructions = 'To install this app on your iPhone:\n\n1. Tap the Share button at the bottom of Safari\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" in the top right corner';
    } else if (isAndroid) {
      instructions = 'To install this app on Android:\n\n1. Tap the three dots menu (⋮) in the top right\n2. Select "Add to Home screen" or "Install app"\n3. Tap "Add" to confirm';
    } else {
      instructions = 'To install this app:\n\n1. Look for "Add to Home Screen" in your browser menu\n2. Or bookmark this page for quick access';
    }

    alert(instructions);
    handleDismiss();
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-sm">
      <div className="bg-surface border border-muted rounded-xl shadow-lg p-4 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="white">
              <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm mb-1">
              Add to Home Screen
            </h3>
            <p className="text-xs text-tertiary leading-relaxed mb-3">
              Install this app for quick access to your tasks and offline use.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="px-3 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity touch-manipulation"
              >
                {deferredPrompt ? 'Install' : 'Show How'}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 bg-muted/30 text-tertiary rounded-lg text-xs font-medium hover:bg-muted/50 transition-colors touch-manipulation"
              >
                Not Now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-tertiary hover:text-foreground text-lg leading-none p-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper hook to track app visits
export const useAppVisitTracker = () => {
  useEffect(() => {
    const visitCount = parseInt(localStorage.getItem('app-visit-count') || '0');
    localStorage.setItem('app-visit-count', (visitCount + 1).toString());
  }, []);
};