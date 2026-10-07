"use client";

import Link from "next/link";
import { useAuthContext } from "../providers/AuthProvider";
import { membershipTrialOffer, TRIAL_CTA } from "../utils/membershipTrial";
import { Button } from "./ui/Button";

// Navigation only: choosing a plan and starting a trial remain explicit on /pro.
export default function UpgradeLink({ tier, fallback = "Se Plus och Pro", inline = false, children, ...props }) {
  const { user } = useAuthContext();
  const href = tier ? `/pro#plan-${tier}` : "/pro";
  const content = <>{membershipTrialOffer(user) ? TRIAL_CTA : fallback}{children}</>;
  return inline ? <Link href={href} {...props}>{content}</Link>
    : <Button nativeButton={false} role="link" render={<Link href={href} />} {...props}>{content}</Button>;
}
