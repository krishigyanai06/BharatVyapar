import { createSlice } from '@reduxjs/toolkit';

/**
 * mockDataSlice
 *
 * Single Redux slice for ALL temporary/local UI data that has no backend
 * endpoint yet. When a backend endpoint is ready for a feature, move that
 * feature's data to a dedicated API slice and remove it from here.
 *
 * Shape:
 * {
 *   // add more feature arrays below as needed
 * }
 */

const mockDataSlice = createSlice({
  name: 'mockData',
  initialState: {
    // add more feature state properties below as needed
  },
  reducers: {
    // add reducers below as needed
  },
});

export default mockDataSlice.reducer;
