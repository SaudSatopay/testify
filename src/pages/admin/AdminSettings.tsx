import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageSkeleton } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage } from "@/services/api";
import { adminService } from "@/services/adminService";

export default function AdminSettings() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => adminService.settings(), []);

  const [siteName, setSiteName] = useState("Testify");
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [defaultDuration, setDefaultDuration] = useState("30");
  const [monitoringDefault, setMonitoringDefault] = useState(false);
  const [notesVisibleDefault, setNotesVisibleDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    if (typeof data.site_name === "string") setSiteName(data.site_name);
    if (typeof data.registration_enabled === "boolean") setRegistrationEnabled(data.registration_enabled);
    if (typeof data.default_interview_duration === "number")
      setDefaultDuration(String(data.default_interview_duration));
    if (typeof data.monitoring_enabled_default === "boolean") setMonitoringDefault(data.monitoring_enabled_default);
    if (typeof data.notes_visible_to_candidate_default === "boolean")
      setNotesVisibleDefault(data.notes_visible_to_candidate_default);
  }, [data]);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await Promise.all([
        adminService.updateSetting("site_name", siteName.trim() || "Testify", user.id),
        adminService.updateSetting("registration_enabled", registrationEnabled, user.id),
        adminService.updateSetting(
          "default_interview_duration",
          Math.max(5, Math.min(240, Number(defaultDuration) || 30)),
          user.id,
        ),
        adminService.updateSetting("monitoring_enabled_default", monitoringDefault, user.id),
        adminService.updateSetting("notes_visible_to_candidate_default", notesVisibleDefault, user.id),
      ]);
      toast.success("Platform settings saved");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Platform settings" description="Workspace-wide configuration. Changes apply immediately." />

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="site-name">Workspace name</Label>
            <Input id="site-name" value={siteName} onChange={(e) => setSiteName(e.target.value)} className="max-w-sm" />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Allow self-registration</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                When off, only invited or admin-created accounts can join. (Enforce by disabling signups in Supabase
                Auth settings as well.)
              </p>
            </div>
            <Switch
              checked={registrationEnabled}
              onCheckedChange={setRegistrationEnabled}
              aria-label="Allow self registration"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interview defaults</CardTitle>
          <CardDescription>Starting values for new interviews across the workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <Label htmlFor="default-duration" className="text-sm font-medium">
              Default interview duration (minutes)
            </Label>
            <Input
              id="default-duration"
              type="number"
              min={5}
              max={240}
              value={defaultDuration}
              onChange={(e) => setDefaultDuration(e.target.value)}
              className="w-24"
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Assessment monitoring on by default</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Candidates always see a notice while monitoring runs.</p>
            </div>
            <Switch checked={monitoringDefault} onCheckedChange={setMonitoringDefault} aria-label="Monitoring default" />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Interviewer notes visible to candidates by default</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Interviewers can override per note.</p>
            </div>
            <Switch
              checked={notesVisibleDefault}
              onCheckedChange={setNotesVisibleDefault}
              aria-label="Notes visibility default"
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
