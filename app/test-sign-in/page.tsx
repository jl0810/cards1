import { SignIn } from "@clerk/nextjs";

export default function SimpleSignIn() {
  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Simple Sign In Test</h1>
      <SignIn />
    </div>
  );
}
