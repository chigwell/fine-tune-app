import React from "react";

// Admin Imports
import MainDashboard from "views/admin/default";
import Profile from "views/admin/profile";
import ApiKeys from "views/admin/apiKeys";
import Files from "views/admin/files";
import Billing from "views/admin/billing";

// Auth Imports
import SignIn from "views/auth/SignIn";

// Icon Imports
import {
  MdHome,
  MdPerson,
  MdLock,
  MdOutlineVpnKey,
  MdOutlineFolder,
  MdOutlineReceipt,
} from "react-icons/md";

const routes = [
  {
    name: "Home",
    layout: "/admin",
    path: "default",
    icon: <MdHome className="h-6 w-6" />,
    component: <MainDashboard />,
  },
  {
    name: "Profile",
    layout: "/admin",
    path: "profile",
    icon: <MdPerson className="h-6 w-6" />,
    component: <Profile />,
  },
  {
    name: "API Keys",
    layout: "/admin",
    path: "api-keys",
    icon: <MdOutlineVpnKey className="h-6 w-6" />,
    component: <ApiKeys />,
  },
  {
    name: "Files",
    layout: "/admin",
    path: "files",
    icon: <MdOutlineFolder className="h-6 w-6" />,
    component: <Files />,
  },
  {
    name: "Billing",
    layout: "/admin",
    path: "billing",
    icon: <MdOutlineReceipt className="h-6 w-6" />,
    component: <Billing />,
  },
  {
    name: "Sign In",
    layout: "/auth",
    path: "sign-in",
    icon: <MdLock className="h-6 w-6" />,
    component: <SignIn />,
  },
];
export default routes;
