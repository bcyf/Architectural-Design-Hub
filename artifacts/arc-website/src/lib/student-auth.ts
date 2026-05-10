const TOKEN_KEY = "fbc_student_token";

export function getStudentToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStudentToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStudentToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isStudentAuthenticated(): boolean {
  const token = getStudentToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function getStudentPayload(): { id: number; firstName: string; lastName: string; email: string; studentId: string } | null {
  const token = getStudentToken();
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}
