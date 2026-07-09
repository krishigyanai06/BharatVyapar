import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import languageReducer from './languageSlice';

const appReducer = combineReducers({
  auth: authReducer,
  language: languageReducer,
});

const rootReducer = (state, action) => {
  // Clear all slices except language when the user logs out
  if (action.type === 'auth/logoutUser/fulfilled' || action.type === 'auth/logoutUser/rejected') {
    const { language } = state || {};
    state = { language };
  }
  return appReducer(state, action);
};

const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
