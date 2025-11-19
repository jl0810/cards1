import { SignUp } from "@clerk/nextjs";
import { AuthLayout } from "@/components/auth-layout";


export default function Page() {
  return (
    <AuthLayout
      title="Create an account"
      description="Get started for free. No credit card required."
    >
      <SignUp path="/sign-up" />
    </AuthLayout>
  );
}
