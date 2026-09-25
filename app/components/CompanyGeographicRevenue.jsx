import CompanyRevenueBreakdown from './CompanyRevenueBreakdown';
import { geographicRevenueView } from '../utils/segmentRevenue';

export default function CompanyGeographicRevenue({ record }) {
  return <CompanyRevenueBreakdown data={geographicRevenueView(record)} />;
}
