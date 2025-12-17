"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-destructive">
            Access Denied
          </CardTitle>
          <CardDescription>
            You must be a member of the Discord server to access this application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            If you believe this is an error, please contact an administrator.
          </p>
          <Button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full"
            variant="outline"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

