/**
 * Platform Detection Utilities for Capacitor
 *
 * Use these to detect whether the app is running as:
 * - Web (browser)
 * - iOS native app
 * - Android native app
 *
 * This allows you to provide platform-specific functionality
 * while maintaining a single codebase.
 *
 * @module lib/platform
 *
 * @example
 * ```typescript
 * import { isNative, isIOS, platform } from '@/lib/platform';
 *
 * if (isNative) {
 *   // Show native features
 *   return <FaceIDButton />;
 * }
 *
 * // Or use the platform object
 * console.log(platform.name); // 'web', 'ios', or 'android'
 * ```
 */

import { Capacitor } from "@capacitor/core";

/**
 * Check if app is running on a native platform (iOS or Android)
 */
export const isNative = void Capacitor.isNativePlatform();

/**
 * Check if app is running on iOS
 */
export const isIOS = Capacitor.getPlatform() === "ios";

/**
 * Check if app is running on Android
 */
export const isAndroid = Capacitor.getPlatform() === "android";

/**
 * Check if app is running in a web browser
 */
export const isWeb = !isNative;

/**
 * Platform information object
 */
export const platform = {
  /** Current platform: 'web', 'ios', or 'android' */
  name: Capacitor.getPlatform(),

  /** True if running on any native platform */
  isNative,

  /** True if running on iOS */
  isIOS,

  /** True if running on Android */
  isAndroid,

  /** True if running in web browser */
  isWeb,

  /** Get native platform info (null on web) */
  info: isNative ? Capacitor.getPlatform() : null,
} as const;

/**
 * Execute code only on native platforms
 *
 * @param callback - Function to execute on native platforms
 *
 * @example
 * ```typescript
 * onNative(() => {
 *   registerPushNotifications();
 * });
 * ```
 */
export function onNative(callback: () => void | Promise<void>): void {
  if (isNative) {
    void callback();
  }
}

/**
 * Execute code only on iOS
 *
 * @param callback - Function to execute on iOS
 *
 * @example
 * ```typescript
 * onIOS(() => {
 *   setupFaceID();
 * });
 * ```
 */
export function onIOS(callback: () => void | Promise<void>): void {
  if (isIOS) {
    void callback();
  }
}

/**
 * Execute code only on web
 *
 * @param callback - Function to execute on web
 *
 * @example
 * ```typescript
 * onWeb(() => {
 *   showDesktopFeatures();
 * });
 * ```
 */
export function onWeb(callback: () => void | Promise<void>): void {
  if (isWeb) {
    void callback();
  }
}

/**
 * Get platform-specific value
 *
 * @param values - Object with values for each platform
 * @returns The value for the current platform
 *
 * @example
 * ```typescript
 * const buttonText = getPlatformValue({
 *   ios: 'Sign in with Face ID',
 *   android: 'Sign in with Fingerprint',
 *   web: 'Sign in',
 * });
 * ```
 */
export function getPlatformValue<T>(values: {
  ios?: T;
  android?: T;
  web?: T;
}): T | undefined {
  if (isIOS && values.ios !== undefined) return values.ios;
  if (isAndroid && values.android !== undefined) return values.android;
  if (isWeb && values.web !== undefined) return values.web;
  return undefined;
}
