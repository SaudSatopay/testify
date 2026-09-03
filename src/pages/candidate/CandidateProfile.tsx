import { useRef, useState } from "react";
import { FileText, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { initials } from "@/lib/format";
import { errorMessage } from "@/services/api";
import { profileService } from "@/services/profileService";
import { readStringArray } from "@/types";

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your name"),
  phone: z.string().trim().max(25).optional(),
  bio: z.string().trim().max(1000, "Bio must be under 1000 characters").optional(),
  experience_years: z.coerce.number().min(0).max(60).optional(),
});

export default function CandidateProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [experience, setExperience] = useState(profile?.experience_years?.toString() ?? "");
  const [skills, setSkills] = useState<string[]>(readStringArray(profile?.skills ?? []));
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  if (!user || !profile) return null;

  const addSkill = () => {
    const value = skillInput.trim();
    if (!value || skills.includes(value) || skills.length >= 20) return;
    setSkills((prev) => [...prev, value]);
    setSkillInput("");
  };

  const handleSave = async () => {
    const parsed = profileSchema.safeParse({
      full_name: fullName,
      phone: phone || undefined,
      bio: bio || undefined,
      experience_years: experience === "" ? undefined : experience,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your input");
      return;
    }
    setSaving(true);
    try {
      await profileService.update(user.id, {
        full_name: parsed.data.full_name,
        phone: parsed.data.phone ?? null,
        bio: parsed.data.bio ?? null,
        experience_years: parsed.data.experience_years ?? null,
        skills,
      });
      await refreshProfile();
      toast.success("Profile saved");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatar = async (file: File | undefined) => {
    if (!file) return;
    setAvatarUploading(true);
    try {
      await profileService.uploadAvatar(user.id, file);
      await refreshProfile();
      toast.success("Avatar updated");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleResume = async (file: File | undefined) => {
    if (!file) return;
    setResumeUploading(true);
    try {
      await profileService.uploadResume(user.id, file);
      await refreshProfile();
      toast.success("Resume uploaded");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setResumeUploading(false);
    }
  };

  const openResume = async () => {
    if (!profile.resume_url) return;
    try {
      const url = await profileService.resumeSignedUrl(profile.resume_url);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your details help the AI tailor interview questions to you." />

      <div className="grid gap-6 lg:grid-cols-[1fr,340px]">
        <Card>
          <CardHeader>
            <CardTitle>Personal information</CardTitle>
            <CardDescription>Shown to interviewers on interviews you take.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile.email} disabled aria-readonly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 555 000 1234"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">Years of experience</Label>
                <Input
                  id="experience"
                  type="number"
                  min={0}
                  max={60}
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={4}
                placeholder="A short professional summary…"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skill-input">Skills</Label>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge key={skill} variant="info" className="gap-1 pr-1">
                    {skill}
                    <button
                      type="button"
                      aria-label={`Remove ${skill}`}
                      onClick={() => setSkills((prev) => prev.filter((s) => s !== skill))}
                      className="rounded-full p-0.5 hover:bg-primary/20"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="skill-input"
                  placeholder="e.g. React"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addSkill} aria-label="Add skill">
                  <Plus aria-hidden="true" />
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => void handleSave()} loading={saving}>
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Photo</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="text-lg">{initials(profile.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => void handleAvatar(e.target.files?.[0])}
                />
                <Button
                  variant="outline"
                  size="sm"
                  loading={avatarUploading}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Upload aria-hidden="true" /> Upload photo
                </Button>
                <p className="mt-1.5 text-xs text-muted-foreground">PNG, JPG or WebP, up to 5 MB.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resume</CardTitle>
              <CardDescription>Used by the AI to personalize interview questions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.resume_url ? (
                <button
                  type="button"
                  onClick={() => void openResume()}
                  className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">Your resume</span>
                    <span className="text-xs text-muted-foreground">Tap to open (private, signed link)</span>
                  </span>
                </button>
              ) : (
                <p className="text-sm text-muted-foreground">No resume uploaded yet.</p>
              )}
              <input
                ref={resumeInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => void handleResume(e.target.files?.[0])}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                loading={resumeUploading}
                onClick={() => resumeInputRef.current?.click()}
              >
                <Upload aria-hidden="true" /> {profile.resume_url ? "Replace resume" : "Upload resume"}
              </Button>
              <p className="text-xs text-muted-foreground">PDF or Word, up to 10 MB. Stored privately.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
