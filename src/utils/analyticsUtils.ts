import { Check, CheckStatus, Region, Branch } from '../types';

/**
 * Calculates the aging of unresolved checks based on their creation date compared to today.
 * Returns an object with counts for each aging bucket.
 */
export const calculateAgingReport = (checks: Check[]) => {
  const unresolvedChecks = checks.filter(c => c.status !== CheckStatus.COMPLETE && c.status !== CheckStatus.ARCHIVED);
  const now = new Date();

  const buckets = {
    '0-15 Days': 0,
    '16-30 Days': 0,
    '31-60 Days': 0,
    '61-90 Days': 0,
    '90+ Days': 0,
  };

  unresolvedChecks.forEach(check => {
    const createdDate = new Date(check.createdAt);
    if (isNaN(createdDate.getTime())) return;

    // Calculate difference in days
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 15) buckets['0-15 Days']++;
    else if (diffDays <= 30) buckets['16-30 Days']++;
    else if (diffDays <= 60) buckets['31-60 Days']++;
    else if (diffDays <= 90) buckets['61-90 Days']++;
    else buckets['90+ Days']++;
  });

  return buckets;
};

/**
 * Calculates the average processing time in hours for completed checks.
 */
export const calculateAverageProcessingTime = (checks: Check[]): string => {
  const completedChecks = checks.filter(c => c.status === CheckStatus.COMPLETE && c.statusUpdatedAt);
  if (completedChecks.length === 0) return 'N/A';

  let totalHours = 0;
  let validChecksCount = 0;

  completedChecks.forEach(check => {
    const start = new Date(check.createdAt);
    const end = new Date(check.statusUpdatedAt!);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return; // Ignore invalid dates

    const diffHours = diffMs / (1000 * 60 * 60);
    totalHours += diffHours;
    validChecksCount++;
  });

  if (validChecksCount === 0) return 'N/A';

  const averageHours = totalHours / validChecksCount;

  if (averageHours < 24) {
    return `${averageHours.toFixed(1)} hrs`;
  }
  const averageDays = averageHours / 24;
  return `${averageDays.toFixed(1)} days`;
};

/**
 * Calculates volume of checks created month-over-month for the last 6 months.
 */
export const calculateVolumeTrends = (checks: Check[]) => {
  const now = new Date();
  // Get the last 6 months
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
      year: d.getFullYear(),
      month: d.getMonth(),
      count: 0
    };
  }).reverse(); // Oldest to newest

  checks.forEach(check => {
    const createdDate = new Date(check.createdAt);
    if (isNaN(createdDate.getTime())) return;

    const year = createdDate.getFullYear();
    const month = createdDate.getMonth();

    const monthBucket = months.find(m => m.year === year && m.month === month);
    if (monthBucket) {
      monthBucket.count++;
    }
  });

  return {
    labels: months.map(m => m.label),
    data: months.map(m => m.count)
  };
};

/**
 * Aggregates check volumes per Region and Branch.
 */
export const aggregateByRegionAndBranch = (checks: Check[], regions: Region[], branches: Branch[]) => {
  const regionCounts: Record<string, number> = {};
  const branchCounts: Record<string, number> = {};

  // Initialize with 0
  regions.forEach(r => regionCounts[r.name] = 0);
  branches.forEach(b => branchCounts[b.name] = 0);

  checks.forEach(check => {
    if (check.regionId) {
      const region = regions.find(r => r.id === check.regionId);
      if (region) {
        regionCounts[region.name] = (regionCounts[region.name] || 0) + 1;
      }
    }

    if (check.branchId) {
      const branch = branches.find(b => b.id === check.branchId);
      if (branch) {
        branchCounts[branch.name] = (branchCounts[branch.name] || 0) + 1;
      }
    }
  });

  return {
    regions: {
      labels: Object.keys(regionCounts),
      data: Object.values(regionCounts)
    },
    branches: {
      // Sort branches by highest volume first, top 10
      labels: Object.keys(branchCounts).sort((a, b) => branchCounts[b] - branchCounts[a]).slice(0, 10),
      data: Object.keys(branchCounts).sort((a, b) => branchCounts[b] - branchCounts[a]).slice(0, 10).map(k => branchCounts[k])
    }
  };
};
