import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppRoutes from './routes/AppRoutes';
import { Provider } from 'react-redux';
import { store } from './store/store';
import ErrorBoundary from './components/common/ErrorBoundary';
import AutocompleteGuard from './components/common/AutocompleteGuard';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <Router>
          <AutocompleteGuard />
          <AppRoutes />
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
            toastClassName="rounded-xl shadow-lg"
          />
        </Router>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
