"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session) {
      const isMember = (session.user as any)?.isMember;
      if (isMember) {
        router.push("/voting");
      } else {
        router.push("/401");
      }
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
          <CardDescription>
            Sign in with your Discord account to access the voting system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => signIn("discord")}
            className="w-full"
            size="lg"
          >
            Sign in with Discord
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
