export function profileImageUrl(profile, user) {
  const nested = profile?.profile;

  return (
    profile?.imageUrl ||
    profile?.image ||
    profile?.avatarUrl ||
    nested?.imageUrl ||
    nested?.image ||
    nested?.avatarUrl ||
    user?.imageUrl ||
    user?.image ||
    user?.avatarUrl ||
    ""
  );
}

export function profileFirstName(profile, user) {
  const nested = profile?.profile;

  return (
    profile?.firstName ||
    nested?.firstName ||
    user?.firstName ||
    String(profile?.name || user?.name || "").split(" ")[0] ||
    ""
  );
}

export function profileLastName(profile, user) {
  const nested = profile?.profile;

  return (
    profile?.lastName ||
    nested?.lastName ||
    user?.lastName ||
    String(profile?.name || user?.name || "")
      .split(" ")
      .slice(1)
      .join(" ") ||
    ""
  );
}

export function profileDisplayName(profile, user) {
  const nested = profile?.profile;

  return (
    profile?.name ||
    user?.name ||
    [profileFirstName(profile, user), profileLastName(profile, user)].filter(Boolean).join(" ") ||
    nested?.name ||
    "Dart customer"
  );
}
