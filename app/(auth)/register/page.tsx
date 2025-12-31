import { redirect } from "next/navigation";

export default function RegisterPage() {
  // Immediately redirect to the signup page
  redirect("/signup");
  return null; // This line is never reached
}
