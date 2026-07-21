import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

const navigationQueue = [];

/**
 * Global navigation execution helper.
 * Safe to call from anywhere (including non-React contexts like background handlers).
 */
export function navigate(name, params) {
  if (navigationRef.isReady()) {
    console.log(`[NavigationService] Direct navigating to: ${name}`, params);
    navigationRef.navigate(name, params);
  } else {
    console.log(`[NavigationService] Navigation container is not ready yet. Queueing route: ${name}`, params);
    navigationQueue.push({ name, params });
  }
}

/**
 * Triggered on ready state of NavigationContainer.
 * Processes any routing actions captured during app cold boots.
 */
export function flushNavigationQueue() {
  if (navigationRef.isReady() && navigationQueue.length > 0) {
    console.log(`[NavigationService] Flushing ${navigationQueue.length} queued routes...`);
    while (navigationQueue.length > 0) {
      const nextRoute = navigationQueue.shift();
      navigationRef.navigate(nextRoute.name, nextRoute.params);
    }
  }
}
