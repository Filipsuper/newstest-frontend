import { renderSiteIcon } from "../og/_shared/siteIcon";

export const dynamic = "force-static";
export function GET() { return renderSiteIcon(180); }
