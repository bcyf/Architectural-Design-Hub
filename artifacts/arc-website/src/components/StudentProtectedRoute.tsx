import { Redirect } from "wouter";
import { isStudentAuthenticated } from "@/lib/student-auth";

export default function StudentProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isStudentAuthenticated()) {
    return <Redirect to="/login" />;
  }
  return <>{children}</>;
}
