import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Tumhare Figma ke base dimensions
const FIGMA_WIDTH = 390;
const FIGMA_HEIGHT = 844;

/**
 * Width scale
 * Use for: width, marginLeft, marginRight, paddingHorizontal, left, right
 */
export const w = size => (width / FIGMA_WIDTH) * size;

/**
 * Height scale
 * Use for: marginTop, marginBottom, paddingVertical, top, bottom, gap
 */
export const h = size => (height / FIGMA_HEIGHT) * size;

/**
 * Moderate scale
 * Use for: fontSize, borderRadius, component height, balanced spacing, image ke liye bhi use kar sakte ho
 */
export const mw = (size, factor = 0.5) => size + (w(size) - size) * factor;

export const f = size => mw(size, 0.3); // conservative font scaling
