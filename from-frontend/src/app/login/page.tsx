import { Suspense } from "react";
import LoginPage from "./Loginpage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
