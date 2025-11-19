import { SignIn } from "@clerk/nextjs";
import { AuthLayout } from "@/components/auth-layout";


export default function Page() {
  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to continue to your dashboard"
    >
      <SignIn path="/sign-in" />
    </AuthLayout>
  );
}
