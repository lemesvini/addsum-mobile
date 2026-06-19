export const queryKeys = {
  profile: () => ["profile"] as const,
  groups: {
    all: () => ["groups"] as const,
    detail: (id: string) => ["groups", id] as const,
    members: (id: string) => ["groups", id, "members"] as const,
    expenses: (groupId: string) => ["groups", groupId, "expenses"] as const,
    expense: (groupId: string, id: string) =>
      ["groups", groupId, "expenses", id] as const,
    categories: (groupId: string) =>
      ["groups", groupId, "categories"] as const,
  },
  users: () => ["users"] as const,
};
