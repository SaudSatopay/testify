import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage } from "@/services/api";
import { profileService } from "@/services/profileService";

interface InterviewerPrefs {
  default_monitoring?: boolean;
  default_video_analysis?: boolean;
  default_notes_private?: boolean;
  default_duration_minutes?: number;
}

function readPrefs(settings: unknown): InterviewerPrefs {
  if (settings && typeof settings === "object" && !Array.isArray(settings)) {
    return settings as InterviewerPrefs;
  }
  return {};
}

export default function InterviewerSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const prefs = readPrefs(profile?.settings);

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [defaultMonitoring, setDefaultMonitoring] = useState(prefs.default_monitoring ?? false);
  const [defaultVideoAnalysis, setDefaultVideoAnalysis] = useState(prefs.default_video_analysis ?? true);
  const [defaultNotesPrivate, setDefaultNotesPrivate] = useState(prefs.default_notes_private ?? true);
  const [defaultDuration, setDefaultDuration] = useState(String(prefs.default_duration_minutes ?? 45));
  const [saving, setSaving] = useState(false);

  if (!user || !profile) return null;

  const save = async () => {
    setSaving(true);
    try {
      await profileService.update(user.id, {
        full_name: fullName.trim() || profile.full_name,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        settings: {
          default_monitoring: defaultMonitoring,
          default_video_analysis: defaultVideoAnalysis,
          default_notes_private: defaultNotesPrivate,
          default_duration_minutes: Math.max(5, Math.min(240, Number(defaultDuration) || 45)),
        },
      });
      await refreshProfile();
      toast.success("Settings saved");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Your profile and interview defaults." />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="s-name">Full name</Label>
            <Input id="s-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-email">Email</Label>
            <Input id="s-email" value={profile.email} disabled aria-readonly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-phone">Phone</Label>
            <Input id="s-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="s-bio">Bio</Label>
            <Textarea id="s-bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interview defaults</CardTitle>
          <CardDescription>Applied as starting values when you create new interviews.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Enable assessment monitoring by default</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Candidates always see a notice when active.</p>
            </div>
            <Switch checked={defaultMonitoring} onCheckedChange={setDefaultMonitoring} aria-label="Default monitoring" />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Offer optional video-signal analysis by default</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Candidates still give separate consent per interview.</p>
            </div>
            <Switch
              checked={defaultVideoAnalysis}
              onCheckedChange={setDefaultVideoAnalysis}
              aria-label="Default video analysis offer"
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Keep notes private by default</p>
              <p className="mt-0.5 text-xs text-muted-foreground">You can still share individual notes.</p>
            </div>
            <Switch
              checked={defaultNotesPrivate}
              onCheckedChange={setDefaultNotesPrivate}
              aria-label="Default note privacy"
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <Label htmlFor="s-duration" className="text-sm font-medium">
                Default interview duration (minutes)
              </Label>
            </div>
            <Input
              id="s-duration"
              type="number"
              min={5}
              max={240}
              value={defaultDuration}
              onChange={(e) => setDefaultDuration(e.target.value)}
              className="w-24"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pb-4">
        <Button onClick={() => void save()} loading={saving}>
          Save settings
        </Button>
      </div>
    </div>
  );
}
