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
 *   requirements : []   ← buyer requirements (HomeScreen → MarketplaceScreen DEMANDS tab)
 *   // add more feature arrays below as needed
 * }
 */

const mockDataSlice = createSlice({
  name: 'mockData',
  initialState: {
    requirements: [],
    // warehouseSlots: [],   // example: uncomment when WarehouseScreen needs local data
  },
  reducers: {
    // ─── Requirements ──────────────────────────────────────────────────────────
    addRequirement: (state, action) => {
      console.log('[mockDataSlice] addRequirement payload received:', action.payload);
      const payload = action.payload;
      const newReq = {
        ...payload,
        _id: `req_${Math.random().toString(36).slice(2, 9)}`,
        status: 'OPEN',
        remainingQuantity: payload.quantity,
        createdAt: new Date().toISOString(),
      };
      state.requirements.unshift(newReq); // newest first
      console.log('[mockDataSlice] Updated requirements in Redux:', JSON.parse(JSON.stringify(state.requirements)));
    },

    removeRequirement: (state, action) => {
      state.requirements = state.requirements.filter(r => r._id !== action.payload);
    },

    // ─── Template for next feature ─────────────────────────────────────────────
    // addWarehouseSlot: (state, action) => {
    //   state.warehouseSlots.unshift(action.payload);
    // },
  },
});

export const { addRequirement, removeRequirement } = mockDataSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectRequirements = state => state.mockData.requirements;

export default mockDataSlice.reducer;
