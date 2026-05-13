export const cacheTags = {
  matches: (companyId: string) => `matches:${companyId}`,
  profile: (userId: string) => `profile:${userId}`,
  counts: (userId: string) => `counts:${userId}`,
  grantsPublished: () => `grants:published`,
};
