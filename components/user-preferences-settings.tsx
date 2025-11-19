"use client";


import { useUserPreferences } from "@/hooks/use-user-preferences";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "./LoadingSpinner";


export function UserPreferencesSettings() {
  const { preferences, loading, updatePreference } = useUserPreferences();


  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Loading your preferences...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>App Preferences</CardTitle>
        <CardDescription>
          Manage your notification and appearance settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground">Notifications</h3>
          <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
            <Label htmlFor="newsletter-enabled" className="flex flex-col space-y-1">
              <span>Marketing Emails</span>
              <span className="font-normal text-sm text-muted-foreground">
                Receive updates about new features and promotions.
              </span>
            </Label>
            <Switch
              id="newsletter-enabled"
              checked={preferences.newsletter}
              onCheckedChange={(checked) =>
                updatePreference("newsletter", checked)
              }
            />
          </div>
           <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
            <Label htmlFor="notifications-enabled" className="flex flex-col space-y-1">
              <span>Activity Notifications</span>
              <span className="font-normal text-sm text-muted-foreground">
                Get notified about comments and mentions.
              </span>
            </Label>
            <Switch
              id="notifications-enabled"
              checked={preferences.notifications}
              onCheckedChange={(checked) =>
                updatePreference("notifications", checked)
              }
            />
          </div>
        </div>

        {/* Appearance Settings */}
         <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground">Appearance</h3>
          <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
            <Label htmlFor="theme-select" className="flex flex-col space-y-1">
              <span>Language</span>
              <span className="font-normal text-sm text-muted-foreground">
                This will be your default language in the app.
              </span>
            </Label>
            <Select
              value={preferences.language}
              onValueChange={(value) => updatePreference("language", value)}
            >
              <SelectTrigger id="theme-select" className="w-[180px]">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button disabled={loading}>
          {loading ? <LoadingSpinner /> : "Save Preferences"}
        </Button>
      </CardFooter>
    </Card>
  );
}
