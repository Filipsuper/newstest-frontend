"use client";

import { FiMail } from "react-icons/fi";
import { useAuthContext } from "../providers/AuthProvider";
import { useCompanyAlerts } from "../hooks/useCompanyAlerts";
import { companyAlertsEnabled, companyAlertStatus } from "../utils/companyAlerts";
import WatchPreferencesButton from "./WatchPreferencesButton";

export default function CompanyAlertStatus() {
  const { user } = useAuthContext();
  const alerts = useCompanyAlerts(user);
  if (!companyAlertsEnabled() || !user?.email) return null;
  // Keep the existing dialog mounted through follow changes and background
  // failures. Replacing the trigger would silently destroy its unsaved draft.
  const waiting = alerts.loading && !alerts.resource;
  const label = waiting ? "Hämtar mejlval…" : alerts.error ? "Mejlval otillgängliga"
    : alerts.resource ? companyAlertStatus(alerts.resource) : "Välj mejlbevakning";
  return (
    <WatchPreferencesButton variant="ghost" size="sm" initialSection="email" loading={waiting} icon={<FiMail aria-hidden="true" />}>
      {label}
    </WatchPreferencesButton>
  );
}
