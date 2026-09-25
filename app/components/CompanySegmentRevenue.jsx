import CompanyRevenueBreakdown from './CompanyRevenueBreakdown';
import { segmentRevenueView } from '../utils/segmentRevenue';

export default function CompanySegmentRevenue({ record, className }) {
  return <CompanyRevenueBreakdown data={segmentRevenueView(record)} className={className} />;
}
