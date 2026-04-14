interface GrantForMatching {
  eligibleAtecoCodes: string[];
  eligibleRegions: string[];
  eligibleCompanySizes: string[];
  status: string;
  deadline: string | null;
}

interface CompanyForMatching {
  atecoCode: string;
  region: string;
  employeeCount: string;
}

export function isGrantEligible(
  grant: GrantForMatching,
  company: CompanyForMatching
): boolean {
  if (grant.status !== "PUBLISHED") return false;

  if (grant.deadline && new Date(grant.deadline) < new Date()) return false;

  if (grant.eligibleAtecoCodes.length > 0) {
    const matches = grant.eligibleAtecoCodes.some(
      (code) =>
        company.atecoCode === code || company.atecoCode.startsWith(code + ".")
    );
    if (!matches) return false;
  }

  if (grant.eligibleRegions.length > 0) {
    if (!grant.eligibleRegions.includes(company.region)) return false;
  }

  if (grant.eligibleCompanySizes.length > 0) {
    if (!grant.eligibleCompanySizes.includes(company.employeeCount))
      return false;
  }

  return true;
}
