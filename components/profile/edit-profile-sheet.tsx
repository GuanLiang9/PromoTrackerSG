"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Pencil } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar } from "@/components/profile/avatar";
import { updateProfile, uploadAvatar } from "@/lib/profiles/actions";
import { useToast } from "@/components/feedback/toast-provider";
import { displayNameOf, type PublicProfile } from "@/lib/profiles/types";

const inputCls =
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/30 focus:ring-2 focus:ring-ring";

/** The profile editor, opened by any trigger element passed as children. */
export function ProfileEditSheet({
  profile,
  children,
}: {
  profile: PublicProfile;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [displayName, setDisplayName] = React.useState(profile.displayName ?? "");
  const [username, setUsername] = React.useState(profile.username ?? "");
  const [bio, setBio] = React.useState(profile.bio ?? "");
  const [isPublic, setIsPublic] = React.useState(profile.isPublic);
  const [avatarUrl, setAvatarUrl] = React.useState(profile.avatarUrl ?? null);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("avatar", file);
    const res = await uploadAvatar(fd);
    setUploading(false);
    if (!res.ok) {
      setError(res.error ?? "Upload failed.");
      return;
    }
    setAvatarUrl(res.avatarUrl ?? null);
    toast({ title: "Avatar updated" });
    router.refresh();
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    const res = await updateProfile({ displayName, username, bio, isPublic });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Could not save.");
      return;
    }
    toast({ title: "Profile saved" });
    setOpen(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pt-2">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar src={avatarUrl} name={displayName} size="lg" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-foreground text-background shadow-sm disabled:opacity-50"
                aria-label="Change avatar"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              Tap the camera to upload a photo.
              <br />
              JPG or PNG, up to 5 MB.
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarChange}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Display name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              className={inputCls}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={24}
              className={inputCls}
              placeholder="handle (letters, numbers, _)"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              rows={3}
              className={`${inputCls} resize-none`}
              placeholder="A little about your food taste…"
            />
          </div>

          {/* Visibility */}
          <button
            type="button"
            onClick={() => setIsPublic((v) => !v)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border bg-background px-3.5 py-3 text-left transition-colors hover:bg-accent"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Public profile</span>
              <span className="block text-xs text-muted-foreground">
                {isPublic
                  ? "Anyone can see your check-ins."
                  : "Only friends can see your check-ins."}
              </span>
            </span>
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${isPublic ? "bg-brand" : "bg-muted-foreground/30"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${isPublic ? "left-[1.375rem]" : "left-0.5"}`}
              />
            </span>
          </button>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** The "Edit profile" button used in the profile header action slot. */
export function EditProfileButton({ profile }: { profile: PublicProfile }) {
  return (
    <ProfileEditSheet profile={profile}>
      <button className="inline-flex items-center gap-1.5 rounded-xl border bg-background px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-accent">
        <Pencil className="h-4 w-4" /> Edit profile
      </button>
    </ProfileEditSheet>
  );
}

/** Tappable avatar (with a camera badge) that opens the editor — the intuitive
 *  "tap my photo to change it" affordance. Used on your own profile only. */
export function EditableAvatar({ profile }: { profile: PublicProfile }) {
  return (
    <ProfileEditSheet profile={profile}>
      <button
        type="button"
        className="relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Edit profile photo"
      >
        <Avatar src={profile.avatarUrl} name={displayNameOf(profile)} size="xl" />
        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-foreground text-background shadow-sm">
          <Camera className="h-3.5 w-3.5" />
        </span>
      </button>
    </ProfileEditSheet>
  );
}
