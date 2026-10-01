import { onParked, type ParkedInput } from './park/onParked';

/**
 * Entry point of the bundle embedded in the iOS app (`app/native/SweptCoreBundle.swift`)
 * and run in JavaScriptCore by the Shortcuts intents. JSON in, JSON out, so the
 * Swift side stays a thin shell.
 */
export const parked = (inputJson: string): string => JSON.stringify(onParked(JSON.parse(inputJson) as ParkedInput));
