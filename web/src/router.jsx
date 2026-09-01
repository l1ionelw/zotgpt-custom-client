import { createBrowserRouter } from "react-router-dom";
import DebugPage from "./pages/DebugPage.jsx";

// Routes hardcoded here, flat - no shared layout/nav/header wrapping them.
export const router = createBrowserRouter([{ path: "/", element: <DebugPage /> }]);
