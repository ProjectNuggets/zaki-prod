import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import {
  addAdminMember,
  AdminAccessCode,
  AdminMember,
  AdminStudentVerificationUser,
  createAdminAccessCodes,
  getAdminStudentVerification,
  listAdminMembers,
  listAdminAccessCodes,
  removeAdminMember,
  updateAdminStudentVerification,
  updateAdminAccessCode,
} from "@/lib/api";
import {
  readResponseFormattingConfig,
  writeResponseFormattingConfig,
} from "@/lib/responseFormatting";
import { useAuthStore } from "@/stores";

type ActiveFilter = "all" | "active" | "inactive";

function formatTimestamp(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatAdminRole(value: "super_admin" | "admin" | undefined) {
  if (value === "super_admin") return "Super Admin";
  return "Admin";
}

export function AdminAccessCodesPage() {
  const token = useAuthStore((state) => state.token);
  const [items, setItems] = useState<AdminAccessCode[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [adminMembers, setAdminMembers] = useState<AdminMember[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(true);
  const [actorRole, setActorRole] = useState<"super_admin" | "admin">("admin");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [adminEmailInput, setAdminEmailInput] = useState("");
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [removingAdminEmail, setRemovingAdminEmail] = useState<string | null>(null);
  const [disableResponseEnvelope, setDisableResponseEnvelope] = useState(false);
  const [studentEmailInput, setStudentEmailInput] = useState("");
  const [studentRecord, setStudentRecord] = useState<AdminStudentVerificationUser | null>(null);
  const [studentLookupError, setStudentLookupError] = useState<string | null>(null);
  const [isStudentLookupLoading, setIsStudentLookupLoading] = useState(false);
  const [isStudentUpdateLoading, setIsStudentUpdateLoading] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");

  const [campaign, setCampaign] = useState("launch");
  const [count, setCount] = useState("10");
  const [durationDays, setDurationDays] = useState("30");
  const [maxRedemptions, setMaxRedemptions] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [createActive, setCreateActive] = useState(true);

  const listCountLabel = useMemo(() => {
    if (!items.length) return "No codes yet";
    return `Showing ${items.length} of ${total}`;
  }, [items.length, total]);

  const loadCodes = useCallback(
    async (manual: boolean) => {
      if (manual) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      try {
        const activeParam =
          activeFilter === "all" ? undefined : activeFilter === "active";
        const { response, data } = await listAdminAccessCodes({
          search: searchQuery || undefined,
          active: activeParam,
          limit: 200,
          offset: 0,
        });

        if (response.status === 403) {
          setForbidden(true);
          return;
        }

        if (!response.ok || !data.success) {
          throw new Error(data.error ?? "Unable to load access codes.");
        }

        setForbidden(false);
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total || 0));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load access codes.";
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeFilter, searchQuery]
  );

  const loadAdminMembers = useCallback(async () => {
    setIsMembersLoading(true);
    try {
      const { response, data } = await listAdminMembers();

      if (response.status === 403) {
        setForbidden(true);
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Unable to load admin members.");
      }

      setForbidden(false);
      const members = Array.isArray(data.items) ? data.items : [];
      setAdminMembers(members);
      const role = data.actor?.role === "super_admin" ? "super_admin" : "admin";
      setActorRole(role);
      setIsSuperAdmin(Boolean(data.actor?.isSuperAdmin));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load admin members.";
      toast.error(message);
    } finally {
      setIsMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCodes(false);
  }, [loadCodes]);

  useEffect(() => {
    void loadAdminMembers();
  }, [loadAdminMembers]);

  useEffect(() => {
    setDisableResponseEnvelope(
      readResponseFormattingConfig().disableResponseEnvelope
    );
  }, []);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (forbidden) {
    return (
      <div className="h-full overflow-y-auto zaki-scrollbar-fade px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-zaki-subtle bg-white px-6 py-8 text-center dark:bg-zaki-dark-card">
          <h1 className="text-2xl font-semibold text-zaki-primary dark:text-zaki-dark-primary">
            Not found
          </h1>
          <p className="mt-2 text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
            This page is not available.
          </p>
        </div>
      </div>
    );
  }

  const onSubmitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreating) return;

    const normalizedCampaign = campaign.trim();
    const parsedCount = Number.parseInt(count, 10);
    const parsedDuration = Number.parseInt(durationDays, 10);
    const normalizedMax = maxRedemptions.trim();
    const parsedMax =
      normalizedMax.length > 0 ? Number.parseInt(normalizedMax, 10) : null;

    if (!normalizedCampaign) {
      toast.error("Campaign is required.");
      return;
    }
    if (!Number.isInteger(parsedCount) || parsedCount < 1 || parsedCount > 200) {
      toast.error("Count must be between 1 and 200.");
      return;
    }
    if (!Number.isInteger(parsedDuration) || parsedDuration < 1 || parsedDuration > 3650) {
      toast.error("Duration must be between 1 and 3650 days.");
      return;
    }
    if (parsedMax !== null && (!Number.isInteger(parsedMax) || parsedMax < 1)) {
      toast.error("Max redemptions must be empty or at least 1.");
      return;
    }

    setIsCreating(true);
    try {
      const { response, data } = await createAdminAccessCodes({
        campaign: normalizedCampaign,
        count: parsedCount,
        durationDays: parsedDuration,
        maxRedemptions: parsedMax,
        expiresAt: expiresAt || null,
        active: createActive,
      });

      if (response.status === 403) {
        setForbidden(true);
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Unable to create access codes.");
      }

      const createdCodes = Array.isArray(data.codes) ? data.codes : [];
      const createdCount = Number(data.count ?? createdCodes.length);
      toast.success(`Created ${createdCount} access code${createdCount === 1 ? "" : "s"}.`);
      await loadCodes(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create access codes.");
    } finally {
      setIsCreating(false);
    }
  };

  const onToggleActive = async (code: AdminAccessCode) => {
    if (updatingId) return;
    setUpdatingId(code.id);
    try {
      const { response, data } = await updateAdminAccessCode(code.id, {
        active: !code.active,
      });

      if (response.status === 403) {
        setForbidden(true);
        return;
      }

      if (!response.ok || !data.success || !data.code) {
        throw new Error(data.error ?? "Unable to update access code.");
      }

      setItems((previous) =>
        previous.map((item) => (item.id === code.id ? data.code || item : item))
      );
      toast.success(data.code.active ? "Code enabled." : "Code disabled.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update access code.");
    } finally {
      setUpdatingId(null);
    }
  };

  const onAddAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSuperAdmin || isAddingAdmin) return;

    const email = adminEmailInput.trim().toLowerCase();
    if (!email) {
      toast.error("Admin email is required.");
      return;
    }

    setIsAddingAdmin(true);
    try {
      const { response, data } = await addAdminMember(email);
      if (response.status === 403) {
        toast.error("Only super admin can add admins.");
        return;
      }
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Unable to add admin.");
      }
      toast.success(data.message || "Admin saved.");
      setAdminEmailInput("");
      await loadAdminMembers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add admin.");
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const onRemoveAdmin = async (email: string) => {
    if (!isSuperAdmin || removingAdminEmail) return;
    setRemovingAdminEmail(email);
    try {
      const { response, data } = await removeAdminMember(email);
      if (response.status === 403) {
        toast.error("Only super admin can remove admins.");
        return;
      }
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Unable to remove admin.");
      }
      toast.success("Admin removed.");
      await loadAdminMembers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove admin.");
    } finally {
      setRemovingAdminEmail(null);
    }
  };

  const onToggleResponseEnvelope = () => {
    const nextValue = !disableResponseEnvelope;
    setDisableResponseEnvelope(nextValue);
    writeResponseFormattingConfig({
      disableResponseEnvelope: nextValue,
    });
    toast.success(
      nextValue
        ? "Response envelope disabled for this browser."
        : "Response envelope restored for this browser."
    );
  };

  const lookupStudentVerification = async () => {
    const email = studentEmailInput.trim().toLowerCase();
    if (!email) {
      toast.error("Student email is required.");
      return;
    }

    setIsStudentLookupLoading(true);
    setStudentLookupError(null);
    try {
      const { response, data } = await getAdminStudentVerification(email);
      if (response.status === 403) {
        setForbidden(true);
        return;
      }
      if (!response.ok || !data.success || !data.user) {
        throw new Error(data.error ?? "Unable to load student verification.");
      }
      setStudentRecord(data.user);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load student verification.";
      setStudentRecord(null);
      setStudentLookupError(message);
      toast.error(message);
    } finally {
      setIsStudentLookupLoading(false);
    }
  };

  const setStudentVerification = async (verified: boolean) => {
    const email = studentRecord?.email || studentEmailInput.trim().toLowerCase();
    if (!email) {
      toast.error("Student email is required.");
      return;
    }

    setIsStudentUpdateLoading(true);
    try {
      const { response, data } = await updateAdminStudentVerification(email, verified);
      if (response.status === 403) {
        setForbidden(true);
        return;
      }
      if (!response.ok || !data.success || !data.user) {
        throw new Error(data.error ?? "Unable to update student verification.");
      }
      setStudentRecord(data.user);
      setStudentLookupError(null);
      toast.success(data.message || "Student verification updated.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update student verification."
      );
    } finally {
      setIsStudentUpdateLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto zaki-scrollbar-fade px-6 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-2xl border border-zaki-subtle bg-white px-6 py-6 shadow-[0px_16px_30px_rgba(15,15,15,0.06)] dark:bg-zaki-dark-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-zaki-muted">Formatting</div>
              <h2 className="mt-2 text-xl font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                Response Envelope Override
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
                Browser-local testing switch for the backend response envelope. Turn it off here to
                let TYP respond without the `ZAKI_RESPONSE_FORMAT_V1` wrapper.
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleResponseEnvelope}
              className="zaki-btn zaki-btn-secondary"
            >
              {disableResponseEnvelope ? "Envelope Off" : "Envelope On"}
            </button>
          </div>
          <div className="mt-4 rounded-xl border border-zaki-subtle bg-zaki-hover px-4 py-3 text-sm text-zaki-secondary dark:bg-zaki-dark-bg/40 dark:text-zaki-dark-subtle">
            Current browser state:{" "}
            <span className="font-medium text-zaki-primary dark:text-zaki-dark-primary">
              {disableResponseEnvelope ? "disabled" : "enabled"}
            </span>
            . This does not change server defaults for other users.
          </div>
        </section>

        <section className="rounded-2xl border border-zaki-subtle bg-white px-6 py-6 shadow-[0px_16px_30px_rgba(15,15,15,0.06)] dark:bg-zaki-dark-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-zaki-muted">Billing</div>
              <h2 className="mt-2 text-xl font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                Student Verification
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
                Mark a user as manually eligible for the Student plan when support has reviewed
                their enrollment proof.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex min-w-[280px] flex-1 flex-col gap-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
              Student email
              <input
                type="email"
                value={studentEmailInput}
                onChange={(event) => setStudentEmailInput(event.target.value)}
                className="rounded-xl border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus dark:bg-zaki-dark-card dark:text-zaki-dark-primary"
                placeholder="student@example.edu"
              />
            </label>
            <button
              type="button"
              disabled={isStudentLookupLoading}
              className="zaki-btn zaki-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                void lookupStudentVerification();
              }}
            >
              {isStudentLookupLoading ? "Checking..." : "Check status"}
            </button>
          </div>

          {studentLookupError ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
              {studentLookupError}
            </div>
          ) : null}

          {studentRecord ? (
            <div className="mt-4 rounded-xl border border-zaki-subtle bg-zaki-hover px-4 py-4 dark:bg-zaki-dark-bg/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                    {studentRecord.email}
                  </div>
                  <div className="mt-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
                    Status: {studentRecord.studentVerified ? "Verified" : "Not verified"}
                    {studentRecord.studentVerifiedAt
                      ? ` · Updated ${formatTimestamp(studentRecord.studentVerifiedAt)}`
                      : ""}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isStudentUpdateLoading || studentRecord.studentVerified}
                    className="zaki-btn zaki-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      void setStudentVerification(true);
                    }}
                  >
                    {isStudentUpdateLoading && !studentRecord.studentVerified
                      ? "Saving..."
                      : "Mark verified"}
                  </button>
                  <button
                    type="button"
                    disabled={isStudentUpdateLoading || !studentRecord.studentVerified}
                    className="zaki-btn zaki-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      void setStudentVerification(false);
                    }}
                  >
                    {isStudentUpdateLoading && studentRecord.studentVerified
                      ? "Saving..."
                      : "Remove verification"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-zaki-subtle bg-white px-6 py-6 shadow-[0px_16px_30px_rgba(15,15,15,0.06)] dark:bg-zaki-dark-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-zaki-muted">Admin</div>
              <h2 className="mt-2 text-xl font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                Admin Members
              </h2>
              <p className="mt-1 text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
                Your role: {formatAdminRole(actorRole)}.
              </p>
            </div>
            {!isMembersLoading && (
              <span className="rounded-full border border-zaki-subtle px-3 py-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
                {adminMembers.length} active member{adminMembers.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {isSuperAdmin ? (
            <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={onAddAdmin}>
              <label className="flex min-w-[260px] flex-1 flex-col gap-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
                Add admin email
                <input
                  type="email"
                  value={adminEmailInput}
                  onChange={(event) => setAdminEmailInput(event.target.value)}
                  className="rounded-xl border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus dark:bg-zaki-dark-card dark:text-zaki-dark-primary"
                  placeholder="admin@novanuggets.com"
                />
              </label>
              <button
                type="submit"
                disabled={isAddingAdmin}
                className="zaki-btn zaki-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAddingAdmin ? "Adding..." : "Add admin"}
              </button>
            </form>
          ) : (
            <div className="mt-4 rounded-xl border border-zaki-subtle bg-zaki-hover px-4 py-3 text-sm text-zaki-secondary dark:bg-zaki-dark-bg/40 dark:text-zaki-dark-subtle">
              Only super admin can add or remove admins.
            </div>
          )}

          <div className="mt-4 overflow-auto rounded-xl border border-zaki-subtle">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-zaki-hover dark:bg-zaki-dark-bg/60">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2 font-medium text-zaki-secondary dark:text-zaki-dark-subtle">
                    Email
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium text-zaki-secondary dark:text-zaki-dark-subtle">
                    Role
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium text-zaki-secondary dark:text-zaki-dark-subtle">
                    Added by
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium text-zaki-secondary dark:text-zaki-dark-subtle">
                    Created
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium text-zaki-secondary dark:text-zaki-dark-subtle">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isMembersLoading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-6 text-center text-zaki-muted dark:text-zaki-dark-subtle"
                    >
                      Loading admin members...
                    </td>
                  </tr>
                ) : adminMembers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-6 text-center text-zaki-muted dark:text-zaki-dark-subtle"
                    >
                      No active admins.
                    </td>
                  </tr>
                ) : (
                  adminMembers.map((member) => (
                    <tr key={member.email} className="border-t border-zaki-subtle">
                      <td className="whitespace-nowrap px-3 py-2 text-zaki-primary dark:text-zaki-dark-primary">
                        {member.email}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-zaki-secondary dark:text-zaki-dark-subtle">
                        {formatAdminRole(member.role)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-zaki-secondary dark:text-zaki-dark-subtle">
                        {member.createdBy || "System"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-zaki-secondary dark:text-zaki-dark-subtle">
                        {formatTimestamp(member.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {member.role === "admin" && isSuperAdmin ? (
                          <button
                            type="button"
                            disabled={removingAdminEmail === member.email}
                            className="zaki-btn-sm zaki-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => {
                              void onRemoveAdmin(member.email);
                            }}
                          >
                            {removingAdminEmail === member.email ? "Removing..." : "Remove"}
                          </button>
                        ) : (
                          <span className="text-xs text-zaki-muted">Locked</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-zaki-subtle bg-white px-6 py-6 shadow-[0px_16px_30px_rgba(15,15,15,0.06)] dark:bg-zaki-dark-card">
          <div className="text-xs uppercase tracking-[0.3em] text-zaki-muted">Internal</div>
          <h1 className="mt-2 text-2xl font-semibold text-zaki-primary dark:text-zaki-dark-primary">
            Access Code Admin
          </h1>
          <p className="mt-1 text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
            Hidden panel for generating and managing access codes.
          </p>

          <form className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6" onSubmit={onSubmitCreate}>
            <label className="flex flex-col gap-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
              Campaign
              <input
                value={campaign}
                onChange={(event) => setCampaign(event.target.value)}
                className="rounded-xl border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus dark:bg-zaki-dark-card dark:text-zaki-dark-primary"
                placeholder="launch"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
              Count
              <input
                type="number"
                min={1}
                max={200}
                value={count}
                onChange={(event) => setCount(event.target.value)}
                className="rounded-xl border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus dark:bg-zaki-dark-card dark:text-zaki-dark-primary"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
              Duration (days)
              <input
                type="number"
                min={1}
                max={3650}
                value={durationDays}
                onChange={(event) => setDurationDays(event.target.value)}
                className="rounded-xl border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus dark:bg-zaki-dark-card dark:text-zaki-dark-primary"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
              Max uses
              <input
                type="number"
                min={1}
                value={maxRedemptions}
                onChange={(event) => setMaxRedemptions(event.target.value)}
                className="rounded-xl border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus dark:bg-zaki-dark-card dark:text-zaki-dark-primary"
                placeholder="Leave empty for unlimited"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
              Expires on
              <input
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="rounded-xl border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus dark:bg-zaki-dark-card dark:text-zaki-dark-primary"
              />
            </label>
            <div className="flex flex-col justify-between gap-3">
              <label className="mt-4 inline-flex items-center gap-2 text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
                <input
                  type="checkbox"
                  checked={createActive}
                  onChange={(event) => setCreateActive(event.target.checked)}
                />
                Active
              </label>
              <button
                type="submit"
                disabled={isCreating}
                className="zaki-btn zaki-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? "Creating..." : "Generate codes"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-zaki-subtle bg-white px-6 py-6 shadow-[0px_16px_30px_rgba(15,15,15,0.06)] dark:bg-zaki-dark-card">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
              Search code or campaign
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="rounded-xl border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus dark:bg-zaki-dark-card dark:text-zaki-dark-primary"
                placeholder="launch"
              />
            </label>
            <label className="flex w-[160px] flex-col gap-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
              Status
              <select
                value={activeFilter}
                onChange={(event) => setActiveFilter(event.target.value as ActiveFilter)}
                className="rounded-xl border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus dark:bg-zaki-dark-card dark:text-zaki-dark-primary"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <button
              type="button"
              className="zaki-btn zaki-btn-secondary"
              onClick={() => setSearchQuery(searchInput.trim())}
            >
              Apply
            </button>
            <button
              type="button"
              className="zaki-btn zaki-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isRefreshing}
              onClick={() => {
                void loadCodes(true);
              }}
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <div className="text-xs text-zaki-muted">{listCountLabel}</div>
          </div>

          {errorMessage && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          <div className="mt-4 overflow-auto rounded-xl border border-zaki-subtle">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-zaki-hover dark:bg-zaki-dark-bg/60">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2 font-medium text-zaki-secondary dark:text-zaki-dark-subtle">
                    Code
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium text-zaki-secondary dark:text-zaki-dark-subtle">
                    Campaign
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium text-zaki-secondary dark:text-zaki-dark-subtle">
                    Duration
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium text-zaki-secondary dark:text-zaki-dark-subtle">
                    Uses
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium text-zaki-secondary dark:text-zaki-dark-subtle">
                    Expires
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium text-zaki-secondary dark:text-zaki-dark-subtle">
                    Created
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium text-zaki-secondary dark:text-zaki-dark-subtle">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-center text-zaki-muted dark:text-zaki-dark-subtle"
                    >
                      Loading access codes...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-center text-zaki-muted dark:text-zaki-dark-subtle"
                    >
                      No access codes match the current filters.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-t border-zaki-subtle">
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-zaki-primary dark:text-zaki-dark-primary">
                        {item.code}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-zaki-primary dark:text-zaki-dark-primary">
                        {item.campaign}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-zaki-secondary dark:text-zaki-dark-subtle">
                        {item.durationDays} days
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-zaki-secondary dark:text-zaki-dark-subtle">
                        {item.redeemedCount}/
                        {item.maxRedemptions === null ? "unlimited" : item.maxRedemptions}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-zaki-secondary dark:text-zaki-dark-subtle">
                        {formatTimestamp(item.expiresAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-zaki-secondary dark:text-zaki-dark-subtle">
                        {formatTimestamp(item.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="zaki-btn-sm zaki-btn-secondary"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(item.code);
                                toast.success("Code copied.");
                              } catch {
                                toast.error("Unable to copy code.");
                              }
                            }}
                          >
                            Copy
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            className="zaki-btn-sm zaki-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => {
                              void onToggleActive(item);
                            }}
                          >
                            {updatingId === item.id
                              ? "Saving..."
                              : item.active
                                ? "Disable"
                                : "Enable"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
